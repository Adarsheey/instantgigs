import { Job, JobCategory, UserProfile } from "./types";

// Seeded Jobs positioned relative to center coordinate {x: 50, y: 50} (Campus Dorms)
export const SEEDED_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Banquet Catering Assistant",
    employer: "Grand Pavilion Events",
    category: JobCategory.CATERING_EVENTS,
    payRate: 18.50,
    distance: 1.2,
    locationName: "Grand Pavilion Ballroom (1.2 mi)",
    coords: { x: 42, y: 62 },
    requiredSchedule: [
      { day: "Saturday", session: "afternoon" },
      { day: "Saturday", session: "evening" }
    ],
    spotsRemaining: 4,
    district: "Downtown",
    googleMapsUrl: "https://maps.google.com/?q=Grand+Pavilion+Ballroom",
    description: "Looking for energetic banquet assistants to help set up, serve, and clean up for a weekend wedding reception. Dress code is formal (black slacks, white button-down). High-energy environment with competitive hourly pay plus tips!",
    requirements: [
      "Ability to stand/walk for 5+ hours",
      "Excellent customer service and positive attitude",
      "Punctual and reliable",
      "No prior catering experience required (we train on-site!)"
    ],
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "job-2",
    title: "Campus Cafeteria Delivery Rider",
    employer: "Campus Dining Services",
    category: JobCategory.DELIVERY,
    payRate: 15.00,
    distance: 0.3,
    locationName: "Student Union Cafeteria (0.3 mi)",
    coords: { x: 53, y: 47 },
    requiredSchedule: [
      { day: "Monday", session: "afternoon" },
      { day: "Wednesday", session: "afternoon" },
      { day: "Friday", session: "afternoon" }
    ],
    spotsRemaining: 2,
    district: "Campus",
    googleMapsUrl: "https://maps.google.com/?q=Student+Union+Cafeteria",
    description: "Deliver boxed lunches and refreshments to campus departments using our customized e-bikes. Great way to stay active on campus while earning cash between classes. Rides are strictly within campus limits.",
    requirements: [
      "Comfortable riding an electric bicycle",
      "Good knowledge of campus building layouts",
      "Polite communication with campus staff"
    ],
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "job-3",
    title: "Calculus & Physics Peer Tutor",
    employer: "University Academic Center",
    category: JobCategory.TUTORING,
    payRate: 22.00,
    distance: 0.1,
    locationName: "Library Study Annex (0.1 mi)",
    coords: { x: 48, y: 51 },
    requiredSchedule: [
      { day: "Tuesday", session: "evening" },
      { day: "Thursday", session: "evening" }
    ],
    spotsRemaining: 3,
    district: "Campus",
    description: "Help freshman and sophomore engineering students master single-variable calculus (Math 1A/1B) and classical mechanics (Physics 7A). Flexible evening hours right in the library center. Ideal for STEM majors looking to reinforce their knowledge.",
    requirements: [
      "Grade of A- or higher in peer tutoring courses",
      "Patience and clear explanation skills",
      "Previous tutoring experience is a plus but not required"
    ],
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "job-4",
    title: "Evening Library Desk Assistant",
    employer: "Campus Libraries",
    category: JobCategory.CAMPUS_ASSISTANT,
    payRate: 14.50,
    distance: 0.2,
    locationName: "Main Library circulation Desk (0.2 mi)",
    coords: { x: 50, y: 49 },
    requiredSchedule: [
      { day: "Tuesday", session: "evening" },
      { day: "Thursday", session: "evening" }
    ],
    spotsRemaining: 1,
    district: "Campus",
    description: "Assist with shelving books, managing student study-room bookings, and checking out materials. Offers plenty of downtime during late shifts for homework or self-study when desk traffic is low.",
    requirements: [
      "Current enrolled student with work-study preference (non-work study also welcome)",
      "Basic computer literacy",
      "Attentive and detail-oriented"
    ],
    postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "job-5",
    title: "Backyard Cleanup & Lawn Helper",
    employer: "Mr. Henderson (Local Resident)",
    category: JobCategory.HOME_HELPER,
    payRate: 20.00,
    distance: 2.5,
    locationName: "Oak Ridge Neighborhood (2.5 mi)",
    coords: { x: 30, y: 30 },
    requiredSchedule: [
      { day: "Sunday", session: "morning" },
      { day: "Sunday", session: "afternoon" }
    ],
    spotsRemaining: 2,
    district: "Oak Ridge",
    description: "Need strong helpers to clear fallen branches, rake oak leaves, and stack firewood in my backyard. Looking to get this completed over one weekend. Lunch, cold drinks, and gloves will be provided!",
    requirements: [
      "Ability to lift up to 40 lbs",
      "Enjoys working outdoors",
      "Hardworking and polite"
    ],
    postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "job-6",
    title: "Convenience Store Cashier",
    employer: "QuickStop Market",
    category: JobCategory.RETAIL_CASHIER,
    payRate: 16.00,
    distance: 0.8,
    locationName: "College Ave Plaza (0.8 mi)",
    coords: { x: 57, y: 55 },
    requiredSchedule: [
      { day: "Friday", session: "evening" },
      { day: "Saturday", session: "evening" }
    ],
    spotsRemaining: 2,
    district: "College Ave",
    description: "Run the cash register, stock shelves, and greet customers during weekend evening shifts. QuickStop is located just off campus, heavily visited by college students. Competitive pay and casual work atmosphere.",
    requirements: [
      "Comfortable handling cash and credit transactions",
      "Trustworthy and reliable",
      "Ability to stand for shifts up to 4 hours"
    ],
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "job-7",
    title: "Local Pizza Delivery Driver",
    employer: "Bella Italia Pizzeria",
    category: JobCategory.DELIVERY,
    payRate: 16.50,
    distance: 1.5,
    locationName: "Downtown Dining Strip (1.5 mi)",
    coords: { x: 60, y: 35 },
    requiredSchedule: [
      { day: "Friday", session: "evening" },
      { day: "Saturday", session: "evening" },
      { day: "Sunday", session: "evening" }
    ],
    spotsRemaining: 3,
    district: "Downtown",
    description: "Deliver hot pizzas and Italian meals to local residences and campus dorms. Earn a solid base wage of $16.50/hr plus keepers-tips! Fast-paced, high earnings potential on sports/event weekends.",
    requirements: [
      "Valid driver's license and clean record",
      "Access to own reliable vehicle or scooter",
      "Friendly customer-first attitude"
    ],
    postedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: "job-8",
    title: "Dog Walker & Pet Sitter",
    employer: "Sarah Jenkins (Local Resident)",
    category: JobCategory.HOME_HELPER,
    payRate: 19.00,
    distance: 1.8,
    locationName: "Greenwood Apartments (1.8 mi)",
    coords: { x: 38, y: 42 },
    requiredSchedule: [
      { day: "Monday", session: "morning" },
      { day: "Tuesday", session: "morning" },
      { day: "Thursday", session: "morning" }
    ],
    spotsRemaining: 1,
    district: "Greenwood",
    description: "Walk two extremely friendly golden retrievers (Max & Daisy) while I am busy with remote work meetings. Walks are 45 minutes, starting from Greenwood Apartments and looping around the park nearby.",
    requirements: [
      "Must absolutely love dogs",
      "Prior experience handling medium-to-large breeds",
      "Highly trustworthy and on-time"
    ],
    postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Default profile for the student seeker
export const DEFAULT_STUDENT_PROFILE: UserProfile = {
  name: "Alex Carter",
  email: "alex.carter@university.edu",
  phone: "(555) 321-4950",
  major: "Computer Science & Data Science",
  year: "Junior",
  skills: [
    "Tutoring",
    "Customer Service",
    "Bicycle Riding",
    "Basic Coding",
    "Mathematics",
    "Communication"
  ],
  bio: "Hi! I'm a Junior CS student looking to pick up part-time evening or weekend gigs. I am super reliable, quick on my feet, and eager to help out with tutoring, campus roles, deliveries, or events near the university dorms.",
  resumeText: "Alex Carter\nJunior at State University majoring in CS.\nSkills: tutoring, basic mathematics, cycle delivery, quick learner, tech savvy, friendly.\nExperience: High school math tutor, library book shelver.",
  // Default class schedule slots where the student is busy
  busySchedule: [
    { day: "Monday", session: "morning" },
    { day: "Monday", session: "afternoon" },
    { day: "Tuesday", session: "morning" },
    { day: "Tuesday", session: "afternoon" },
    { day: "Wednesday", session: "morning" },
    { day: "Wednesday", session: "afternoon" },
    { day: "Thursday", session: "morning" },
    { day: "Thursday", session: "afternoon" },
    { day: "Friday", session: "morning" }
  ]
};
