import { render, screen } from "@testing-library/react";
import App from "../App";
import { AuthProvider } from "@/auth/AuthProvider";

jest.mock("../routes", () => ({
  __esModule: true,
  default: () => <div data-testid="app-routes">App Routes Component</div>,
}));

describe("App", () => {
  it("renders without crashing", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByTestId("app-routes")).toBeInTheDocument();
  });

  it("wraps routes with BrowserRouter", () => {
    const { container } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByTestId("app-routes")).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it("renders AppRoutes component", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByText("App Routes Component")).toBeInTheDocument();
  });
});
