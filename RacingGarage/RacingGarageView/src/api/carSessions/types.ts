export type CarSessionRead = {
  id: number;
  teamCarId: number;
  teamCarNumber: string;
  sessionType: string;
  date: string;
  trackName: string;
  driverUserId?: number | null;
  driverName?: string | null;
  laps: number;
  notes?: string | null;
};

export type CarSessionCreate = {
  teamCarId: number;
  sessionType?: string | null;
  date: string;
  trackName: string;
  driverUserId?: number | null;
  laps: number;
  notes?: string | null;
};

export type CarSessionUpdate = CarSessionCreate;
