import { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { changeUserPassword, updateUser } from "@/api/users";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserSettingsPage() {
  const { user, setSession } = useAuth();
  const nav = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setEmail(user?.email ?? "");
    setProfilePassword("");
  }, [user]);

  const profileChanged = useMemo(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const e = email.trim();
    return (
      fn !== (user?.firstName ?? "") ||
      ln !== (user?.lastName ?? "") ||
      e !== (user?.email ?? "")
    );
  }, [
    firstName,
    lastName,
    email,
    user?.firstName,
    user?.lastName,
    user?.email,
  ]);

  const canSaveProfile = useMemo(() => {
    if (!user) return false;
    if (!firstName.trim()) return false;
    if (!lastName.trim()) return false;
    if (!email.trim()) return false;
    if (!profilePassword) return false;
    if (!profileChanged) return false;
    return true;
  }, [user, firstName, lastName, email, profilePassword, profileChanged]);

  const startedPasswordEdit = useMemo(
    () => !!oldPassword || !!newPassword || !!confirmNewPassword,
    [oldPassword, newPassword, confirmNewPassword],
  );

  const passwordError = useMemo(() => {
    if (!startedPasswordEdit) return null;
    if (!oldPassword) return "Enter your current password.";
    if (!newPassword) return "Enter a new password.";
    if (newPassword.length < 6)
      return "New password must be at least 6 characters.";
    if (!confirmNewPassword) return "Confirm your new password.";
    if (newPassword !== confirmNewPassword)
      return "New passwords do not match.";
    return null;
  }, [startedPasswordEdit, oldPassword, newPassword, confirmNewPassword]);

  const canChangePassword = useMemo(() => {
    if (!user) return false;
    if (!startedPasswordEdit) return false;
    return passwordError === null;
  }, [user, startedPasswordEdit, passwordError]);

  async function onSaveProfile() {
    if (!user) return;
    if (!canSaveProfile) return;

    setSavingProfile(true);
    try {
      const resp = await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        oldPassword: profilePassword,
      });

      setSession(resp);

      setProfilePassword("");
      alert("Profile updated.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword() {
    if (!user) return;
    if (passwordError) {
      alert(passwordError);
      return;
    }

    setSavingPassword(true);
    try {
      const resp = await changeUserPassword({
        oldPassword,
        newPassword,
      });

      setSession(resp);

      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      alert("Password updated.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <PageLayout
      title="User Settings"
      subtitle="Manage your profile and password"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground pb-6">
        <Button variant="outline" size="sm" onClick={() => nav(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      {!user ? (
        <div className="text-sm text-muted-foreground">
          You must be logged in.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="font-medium">Profile</div>
            <div className="text-sm text-muted-foreground mt-1">
              Update your name/email. Requires your current password.
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your first name"
                  autoComplete="given-name"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Your last name"
                  autoComplete="family-name"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="profilePassword">Current password</Label>
                <Input
                  id="profilePassword"
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Required to save"
                  autoComplete="current-password"
                />
              </div>

              <Button
                onClick={onSaveProfile}
                disabled={!canSaveProfile || savingProfile}
              >
                {savingProfile ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="font-medium">Password</div>
            <div className="text-sm text-muted-foreground mt-1">
              Change your password. Requires your current password.
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="oldPassword">Current password</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              {passwordError ? (
                <div className="text-xs text-destructive">{passwordError}</div>
              ) : null}

              <Button
                onClick={onChangePassword}
                disabled={!canChangePassword || savingPassword}
              >
                {savingPassword ? "Saving..." : "Change password"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
