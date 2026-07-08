/**
 * Types for the Student Part-Time Job Finder
 */

export enum JobCategory {
  CATERING_EVENTS = "Catering & Events",
  DELIVERY = "Delivery & Logistics",
  CAMPUS_ASSISTANT = "Campus Assistant",
  HOME_HELPER = "Home & Helper Gigs",
  RETAIL_CASHIER = "Retail & Cashier",
  TUTORING = "Tutoring & Teaching",
  OTHER = "Other Gigs"
}

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type TimeSession = "morning" | "afternoon" | "evening";

export interface ScheduleTimeSlot {
  day: DayOfWeek;
  session: TimeSession;
}

export interface Job {
  id: string;
  title: string;
  employer: string;
  category: JobCategory;
  payRate: number; // hourly pay in USD
  distance: number; // distance in miles from simulated user home
  locationName: string;
  coords: { x: number; y: number }; // x/y grid values (0-100) for custom map plotting
  requiredSchedule: ScheduleTimeSlot[]; // hours/sessions the job takes place
  spotsRemaining: number;
  description: string;
  requirements: string[];
  postedAt: string; // ISO date string
  isSystemJob?: boolean; // to differentiate default seeded jobs
  district?: string; // district or place where the work is declared
  googleMapsUrl?: string; // Google Maps URL link for the place
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  major: string;
  year: string; // "Freshman", "Sophomore", "Junior", "Senior", "Graduate"
  skills: string[];
  bio: string;
  resumeText: string;
  busySchedule: ScheduleTimeSlot[]; // user's class/busy hours
}

export interface Application {
  id: string;
  jobId: string;
  applicantProfile: UserProfile;
  coverLetter: string;
  status: "pending" | "interviewing" | "hired" | "declined";
  appliedAt: string;
}
