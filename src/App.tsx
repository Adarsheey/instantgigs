import React, { useState, useMemo } from "react";
import { 
  Job, 
  JobCategory, 
  UserProfile, 
  Application, 
  ScheduleTimeSlot, 
  DayOfWeek, 
  TimeSession 
} from "./types";
import { SEEDED_JOBS, DEFAULT_STUDENT_PROFILE } from "./data";
import MapComponent from "./components/MapComponent";
import ScheduleSelector from "./components/ScheduleSelector";
import AIPitchBuilder from "./components/AIPitchBuilder";
import { 
  Briefcase, 
  Search, 
  DollarSign, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  User, 
  PlusCircle, 
  Building, 
  Check, 
  Calendar, 
  UserCheck, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles,
  ClipboardList
} from "lucide-react";

// Firebase Integration
import { auth, db } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";

export default function App() {
  // --- Core State ---
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_STUDENT_PROFILE);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 }); // Dorms
  
  // Role & Tab Management
  const [currentRole, setCurrentRole] = useState<"student" | "employer">("student");
  const [studentTab, setStudentTab] = useState<"board" | "map" | "scheduler" | "applications">("board");
  const [employerTab, setEmployerTab] = useState<"posted" | "create">("posted");

  // --- Authentication States ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthNotAllowed, setIsAuthNotAllowed] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<JobCategory[]>([]);
  const [minPay, setMinPay] = useState<number>(12);
  const [maxDistance, setMaxDistance] = useState<number>(5);
  const [onlyMatchingSchedule, setOnlyMatchingSchedule] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All Districts");

  // Profile Edit States
  const [editingProfile, setEditingProfile] = useState(false);
  const [profName, setProfName] = useState(userProfile.name);
  const [profMajor, setProfMajor] = useState(userProfile.major);
  const [profYear, setProfYear] = useState(userProfile.year);
  const [profBio, setProfBio] = useState(userProfile.bio);
  const [skillInput, setSkillInput] = useState("");

  // New Job Creation Form States (Employer)
  const [newTitle, setNewTitle] = useState("");
  const [newEmployer, setNewEmployer] = useState("");
  const [newCategory, setNewCategory] = useState<JobCategory>(JobCategory.CATERING_EVENTS);
  const [newPay, setNewPay] = useState<number>(16);
  const [newLocation, setNewLocation] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newGoogleMapsUrl, setNewGoogleMapsUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRequirements, setNewRequirements] = useState("");
  const [newSpots, setNewSpots] = useState<number>(3);
  const [newScheduleSlots, setNewScheduleSlots] = useState<ScheduleTimeSlot[]>([]);
  const [newMapX, setNewMapX] = useState<number>(50);
  const [newMapY, setNewMapY] = useState<number>(50);

  // --- Firebase Synchronizations ---
  
  // 1. Auth Listener & Profile Sync
  React.useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Listen to active user's profile in Firestore
        const profileDocRef = doc(db, "profiles", user.uid);
        try {
          unsubscribeProfile = onSnapshot(
            profileDocRef, 
            (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
              } else {
                // Setup default profile
                const initialProfile: UserProfile = {
                  name: user.displayName || user.email?.split("@")[0] || "Student Seeker",
                  email: user.email || "",
                  phone: "",
                  major: "Computer Science",
                  year: "Freshman",
                  skills: ["Quick Learner", "Positive Attitude"],
                  bio: "Hi! I am looking for part-time student gigs.",
                  resumeText: `${user.displayName || "Student"}\nEmail: ${user.email}\nSkills: quick learner, positive attitude.`,
                  busySchedule: []
                };
                setDoc(profileDocRef, initialProfile).catch(err => {
                  console.error("Error creating initial profile doc:", err);
                });
                setUserProfile(initialProfile);
              }
            },
            (error) => {
              console.error("Error in profile snapshot listener:", error);
            }
          );
        } catch (err) {
          console.error("Failed to setup profile listener:", err);
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setCurrentUser(null);
        setUserProfile(DEFAULT_STUDENT_PROFILE);
      }
    });
    
    return () => {
      unsubscribe();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Sync profile form input state when userProfile loads/changes
  React.useEffect(() => {
    setProfName(userProfile.name);
    setProfMajor(userProfile.major);
    setProfYear(userProfile.year);
    setProfBio(userProfile.bio);
  }, [userProfile]);

  // 2. Real-time Jobs synchronizer (and DB seeder)
  React.useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onSnapshot(
        collection(db, "jobs"), 
        async (snapshot) => {
          if (snapshot.empty) {
            console.log("Seeding empty database with SEEDED_JOBS...");
            for (const job of SEEDED_JOBS) {
              try {
                await setDoc(doc(db, "jobs", job.id), {
                  ...job,
                  postedByUid: "system"
                });
              } catch (err) {
                console.error("Error seeding job:", job.id, err);
              }
            }
          } else {
            const fetchedJobs: Job[] = [];
            snapshot.forEach((docSnap) => {
              fetchedJobs.push(docSnap.data() as Job);
            });
            // Sort newest first
            fetchedJobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
            setJobs(fetchedJobs);
          }
        },
        (error) => {
          console.error("Error in jobs snapshot listener:", error);
        }
      );
    } catch (err) {
      console.error("Failed to setup jobs listener:", err);
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 3. Real-time Applications synchronizer
  React.useEffect(() => {
    if (!currentUser) {
      setApplications([]);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = onSnapshot(
        collection(db, "applications"), 
        (snapshot) => {
          const fetchedApps: Application[] = [];
          snapshot.forEach((docSnap) => {
            fetchedApps.push(docSnap.data() as Application);
          });
          // Sort: newest applied first
          fetchedApps.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
          setApplications(fetchedApps);
        },
        (error) => {
          console.error("Error in applications snapshot listener:", error);
        }
      );
    } catch (err) {
      console.error("Failed to setup applications listener:", err);
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  // Save profile helper
  const saveProfileToFirestore = async (updatedProfile: UserProfile) => {
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, "profiles", auth.currentUser.uid), updatedProfile);
      } catch (err) {
        console.error("Error saving profile to Firestore:", err);
      }
    }
  };

  // --- Dynamic Distance Recalculation ---
  const calculateDistance = (jobCoords: { x: number; y: number }, currentCoords: { x: number; y: number }): number => {
    const dx = jobCoords.x - currentCoords.x;
    const dy = jobCoords.y - currentCoords.y;
    // 100 units is approximately 4.5 miles
    const miles = Math.sqrt(dx * dx + dy * dy) * 0.045;
    return Number(Math.max(0.1, miles).toFixed(1));
  };

  // Dynamically compute jobs relative to current coordinates
  const jobsWithCurrentDistances = useMemo(() => {
    return jobs.map(job => ({
      ...job,
      distance: calculateDistance(job.coords, userCoords)
    }));
  }, [jobs, userCoords]);

  // Helper to check schedule overlap
  const checkScheduleOverlap = (jobSchedule: ScheduleTimeSlot[], busySchedule: ScheduleTimeSlot[]): boolean => {
    return jobSchedule.some(jobSlot => 
      busySchedule.some(busySlot => 
        busySlot.day === jobSlot.day && busySlot.session === jobSlot.session
      )
    );
  };

  // Dynamically extract unique districts/places from all jobs
  const availableDistricts = useMemo(() => {
    const districtsSet = new Set<string>();
    jobs.forEach(job => {
      if (job.district) {
        districtsSet.add(job.district.trim());
      }
    });
    return ["All Districts", ...Array.from(districtsSet).sort()];
  }, [jobs]);

  // --- Filter Logic ---
  const filteredJobs = useMemo(() => {
    return jobsWithCurrentDistances.filter(job => {
      // 1. Search term (title, employer, description, requirements)
      const matchesSearch = 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.employer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Category checkboxes
      const matchesCategory = 
        selectedCategories.length === 0 || 
        selectedCategories.includes(job.category);

      // 3. Minimum Pay rate
      const matchesPay = job.payRate >= minPay;

      // 4. Maximum Distance
      const matchesDistance = job.distance <= maxDistance;

      // 4b. District / Place filter
      const matchesDistrict = selectedDistrict === "All Districts" || 
        (job.district && job.district.toLowerCase() === selectedDistrict.toLowerCase());

      // 5. Schedule Conflict Filter
      const hasConflict = checkScheduleOverlap(job.requiredSchedule, userProfile.busySchedule);
      const matchesSchedule = !onlyMatchingSchedule || !hasConflict;

            // 6. Gigs with spots remaining
      const hasSpots = job.spotsRemaining > 0;

      return matchesSearch && matchesCategory && matchesPay && matchesDistance && matchesDistrict && matchesSchedule && hasSpots;
    });
  }, [jobsWithCurrentDistances, searchTerm, selectedCategories, minPay, maxDistance, selectedDistrict, onlyMatchingSchedule, userProfile.busySchedule]);


  // Active Job Details
  const activeJob = useMemo(() => {
    return jobsWithCurrentDistances.find(job => job.id === selectedJobId) || null;
  }, [jobsWithCurrentDistances, selectedJobId]);

  // Employer's own posted jobs
  const employerJobs = useMemo(() => {
    if (!currentUser) return [];
    return jobsWithCurrentDistances.filter(job => job.postedByUid === currentUser.uid);
  }, [jobsWithCurrentDistances, currentUser]);

  // Student's own applied applications
  const studentApplications = useMemo(() => {
    if (!currentUser) return [];
    return applications.filter(app => app.applicantUid === currentUser.uid);
  }, [applications, currentUser]);

  // Synchronize selected job ID across active roles and list updates
  React.useEffect(() => {
    if (currentRole === "employer") {
      if (employerJobs.length > 0) {
        setSelectedJobId((prevId) => {
          if (prevId && employerJobs.some(j => j.id === prevId)) return prevId;
          return employerJobs[0].id;
        });
      } else {
        setSelectedJobId(null);
      }
    } else if (currentRole === "student") {
      if (filteredJobs.length > 0) {
        setSelectedJobId((prevId) => {
          if (prevId && filteredJobs.some(j => j.id === prevId)) return prevId;
          return filteredJobs[0].id;
        });
      } else {
        setSelectedJobId(null);
      }
    }
  }, [currentRole, employerJobs, filteredJobs]);

  // --- Handler Actions ---
  const handleToggleCategory = (cat: JobCategory) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleToggleScheduleSlot = (day: DayOfWeek, session: TimeSession) => {
    setUserProfile(prev => {
      const exists = prev.busySchedule.some(s => s.day === day && s.session === session);
      const updatedSchedule = exists
        ? prev.busySchedule.filter(s => !(s.day === day && s.session === session))
        : [...prev.busySchedule, { day, session }];
      const updatedProfile = {
        ...prev,
        busySchedule: updatedSchedule
      };
      saveProfileToFirestore(updatedProfile);
      return updatedProfile;
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile = {
      ...userProfile,
      name: profName,
      major: profMajor,
      year: profYear,
      bio: profBio
    };
    setUserProfile(updatedProfile);
    saveProfileToFirestore(updatedProfile);
    setEditingProfile(false);
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!userProfile.skills.includes(skillInput.trim())) {
        setUserProfile(prev => {
          const updatedProfile = {
            ...prev,
            skills: [...prev.skills, skillInput.trim()]
          };
          saveProfileToFirestore(updatedProfile);
          return updatedProfile;
        });
      }
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setUserProfile(prev => {
      const updatedProfile = {
        ...prev,
        skills: prev.skills.filter(s => s !== skill)
      };
      saveProfileToFirestore(updatedProfile);
      return updatedProfile;
    });
  };

  // Student applies with cover pitch
  const handleApply = async (pitch: string) => {
    if (!selectedJobId || !activeJob) return;

    // Must be logged in to apply
    if (!auth.currentUser) {
      setAuthModalOpen(true);
      setAuthError("Please sign in or create an account to apply for student gigs.");
      return;
    }

    // Create new application
    const newApp: Application = {
      id: `app-${Date.now()}`,
      jobId: selectedJobId,
      applicantProfile: userProfile,
      coverLetter: pitch,
      status: "pending",
      appliedAt: new Date().toISOString()
    };

    try {
      // Save application to Firestore
      await setDoc(doc(db, "applications", newApp.id), {
        ...newApp,
        applicantUid: auth.currentUser.uid,
        postedByUid: activeJob.postedByUid || "system"
      });

      // Reduce spots remaining on the job listing in Firestore
      const updatedSpots = Math.max(0, activeJob.spotsRemaining - 1);
      await updateDoc(doc(db, "jobs", selectedJobId), {
        spotsRemaining: updatedSpots
      });
    } catch (err) {
      console.error("Error submitting application:", err);
    }
  };

  // Employer Updates application status (Hire/Interview/Decline)
  const handleUpdateStatus = async (appId: string, nextStatus: "pending" | "interviewing" | "hired" | "declined") => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "applications", appId), {
        status: nextStatus
      });
    } catch (err) {
      console.error("Error updating application status:", err);
    }
  };

  // Employer creates new job post
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newEmployer || !newLocation || !newDistrict || !newDescription) {
      alert("Please fill in all mandatory job details.");
      return;
    }

    // Must be logged in to post
    if (!auth.currentUser) {
      setAuthModalOpen(true);
      setAuthError("Please sign in or create an account to post new gigs.");
      return;
    }

    const requirementsList = newRequirements
      ? newRequirements.split("\n").map(r => r.trim()).filter(Boolean)
      : ["Must be energetic and reliable", "Great team player"];

    const jobId = `job-${Date.now()}`;
    const newJob: Job = {
      id: jobId,
      title: newTitle,
      employer: newEmployer,
      category: newCategory,
      payRate: Number(newPay),
      distance: 0.1, // will recalculate
      locationName: newLocation,
      district: newDistrict.trim() || "Campus",
      googleMapsUrl: newGoogleMapsUrl.trim() || undefined,
      coords: { x: Number(newMapX), y: Number(newMapY) },
      requiredSchedule: newScheduleSlots.length > 0 ? newScheduleSlots : [{ day: "Saturday", session: "afternoon" }],
      spotsRemaining: Number(newSpots),
      description: newDescription,
      requirements: requirementsList,
      postedAt: new Date().toISOString(),
      isSystemJob: false
    };

    try {
      await setDoc(doc(db, "jobs", jobId), {
        ...newJob,
        postedByUid: auth.currentUser.uid
      });
      
      setSelectedJobId(jobId);
      
      // Clear Form
      setNewTitle("");
      setNewEmployer("");
      setNewCategory(JobCategory.CATERING_EVENTS);
      setNewPay(16);
      setNewLocation("");
      setNewDistrict("");
      setNewGoogleMapsUrl("");
      setNewDescription("");
      setNewRequirements("");
      setNewSpots(3);
      setNewScheduleSlots([]);
      setNewMapX(50);
      setNewMapY(50);

      setEmployerTab("posted");
    } catch (err) {
      console.error("Error creating new job:", err);
    }
  };

  const handleToggleNewJobSchedule = (day: DayOfWeek, session: TimeSession) => {
    const exists = newScheduleSlots.some(s => s.day === day && s.session === session);
    if (exists) {
      setNewScheduleSlots(prev => prev.filter(s => !(s.day === day && s.session === session)));
    } else {
      setNewScheduleSlots(prev => [...prev, { day, session }]);
    }
  };

  // Auth Submit handler (Sign In / Register)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setIsAuthNotAllowed(false);

    // Client-side password validation (at least 6 characters)
    if (authPassword.length < 6) {
      setAuthError("Password should be at least 6 characters.");
      setAuthLoading(false);
      return;
    }

    try {
      if (isSignUpMode) {
        if (!authName.trim()) {
          throw new Error("Please provide your full name for registration.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const user = userCredential.user;

        // Initialize user profile doc in Firestore immediately
        const initialProfile: UserProfile = {
          name: authName.trim(),
          email: authEmail,
          phone: "(555) 000-0000",
          major: "Computer Science",
          year: "Freshman",
          skills: ["Quick Learner", "Positive Attitude"],
          bio: "Hi! I am looking for part-time student gigs.",
          resumeText: `${authName.trim()}\nEmail: ${authEmail}\nSkills: quick learner, positive attitude.`,
          busySchedule: []
        };

        await setDoc(doc(db, "profiles", user.uid), initialProfile);
        setUserProfile(initialProfile);
        setAuthModalOpen(false);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setAuthModalOpen(false);
      }
      // Reset Auth form
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (err: any) {
      console.error("Auth submit error:", err);
      let msg = err.message;
      if (err.code === "auth/invalid-credential") {
        msg = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "This email address is already in use.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      } else if (err.code === "auth/operation-not-allowed") {
        setIsAuthNotAllowed(true);
        msg = "Email/Password sign-in method is disabled in the Firebase Console.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign-In helper
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setIsAuthNotAllowed(false);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setAuthModalOpen(false);
      // Reset Auth form
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      // Don't show cancel error as dramatic red alert
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(DEFAULT_STUDENT_PROFILE);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };


  // Helper: group applications by Job ID for employer overview
  const applicationsByJob = useMemo(() => {
    const group: Record<string, Application[]> = {};
    applications.forEach(app => {
      if (!group[app.jobId]) group[app.jobId] = [];
      group[app.jobId].push(app);
    });
    return group;
  }, [applications]);

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900 font-sans" id="app-root-container">
      {/* Header Bar */}
      <header className="bg-white border-b-4 border-amber-400 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-indigo-950">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-indigo-950 flex items-center gap-2">
                Campus GigFinder
                <span className="text-[10px] font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-indigo-950 shadow-sm animate-pulse">
                  VIBRANT
                </span>
              </h1>
              <p className="text-xs font-semibold text-slate-600">Connecting college students with local flexible part-time gigs</p>
            </div>
          </div>

          {/* Controls Container */}
          <div className="flex flex-wrap items-center gap-3">
            {/* User Account / Auth Widget */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-indigo-50/85 border-2 border-indigo-950 px-3.5 py-1.5 rounded-2xl shadow-xs">
                <div className="w-6.5 h-6.5 bg-indigo-600 text-white font-black rounded-full flex items-center justify-center text-[10px] border border-indigo-950 uppercase">
                  {userProfile.name ? userProfile.name.charAt(0) : currentUser.email?.charAt(0) || "U"}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-[10px] font-black leading-none text-indigo-950 truncate max-w-[120px]">{userProfile.name || "Logged In User"}</p>
                  <p className="text-[8px] font-bold text-slate-500 truncate max-w-[120px]">{currentUser.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-1 px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white border-2 border-indigo-950 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_1.5px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalOpen(true);
                  setAuthError(null);
                  setIsSignUpMode(false);
                  setIsAuthNotAllowed(false);
                }}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-indigo-950 border-2 border-indigo-950 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_2.5px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                Sign In / Register
              </button>
            )}

            {/* Dual-Role Toggle */}
            <div className="flex items-center bg-indigo-50/80 rounded-2xl p-1 border-2 border-indigo-950 shadow-sm">
              <button
                onClick={() => {
                  setCurrentRole("student");
                  setSelectedJobId(jobs[0]?.id || null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentRole === "student"
                    ? "bg-indigo-600 text-white shadow-md border border-indigo-950"
                    : "text-indigo-950/75 hover:text-indigo-600"
                }`}
              >
                <User className="w-4 h-4" />
                Find Jobs (Student)
              </button>
              <button
                onClick={() => {
                  setCurrentRole("employer");
                  setSelectedJobId(jobs[0]?.id || null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentRole === "employer"
                    ? "bg-indigo-600 text-white shadow-md border border-indigo-950"
                    : "text-indigo-950/75 hover:text-indigo-600"
                }`}
              >
                <Building className="w-4 h-4" />
                Post & Hire (Employer)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ==============================================
            ROLE 1: STUDENT SEEKER WORKSPACE
            ============================================== */}
        {currentRole === "student" && (
          <div className="space-y-6">
            
            {/* Student Navigation Sub-tabs */}
            <div className="flex border-b-4 border-indigo-950 gap-2 overflow-x-auto pb-px">
              <button
                onClick={() => setStudentTab("board")}
                className={`pb-3 px-5 text-xs font-black uppercase tracking-widest border-b-4 transition-all cursor-pointer whitespace-nowrap ${
                  studentTab === "board"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-indigo-950"
                }`}
              >
                Available Gigs ({filteredJobs.length})
              </button>
              <button
                onClick={() => setStudentTab("map")}
                className={`pb-3 px-5 text-xs font-black uppercase tracking-widest border-b-4 transition-all cursor-pointer whitespace-nowrap ${
                  studentTab === "map"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-indigo-950"
                }`}
              >
                Interactive Map
              </button>
              <button
                onClick={() => setStudentTab("scheduler")}
                className={`pb-3 px-5 text-xs font-black uppercase tracking-widest border-b-4 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  studentTab === "scheduler"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-indigo-950"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Schedule Planner
              </button>
              <button
                onClick={() => setStudentTab("applications")}
                className={`pb-3 px-5 text-xs font-black uppercase tracking-widest border-b-4 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  studentTab === "applications"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-indigo-950"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                My Applications ({studentApplications.length})
              </button>
            </div>

            {/* Sub-tab 1 & 2: Main Job Board Grid */}
            {(studentTab === "board" || studentTab === "map") && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Search & Filters Left Sidebar */}
                <div className="lg:col-span-4 space-y-6 bg-white rounded-[2rem] border-4 border-indigo-950 p-6 shadow-xl h-fit">
                  <div>
                    <h3 className="font-display font-black text-indigo-950 text-base sm:text-lg uppercase tracking-wider">Filter Gigs</h3>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">Narrow down based on schedule, budget, or distance</p>
                  </div>

                  {/* Keyword Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search title, employer, description..."
                      className="w-full text-xs pl-10 pr-4 py-3 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 placeholder-slate-400 font-semibold"
                    />
                  </div>

                  {/* District / Place Filter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      District / Place
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full text-xs px-3.5 py-3 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 font-black appearance-none cursor-pointer"
                      >
                        {availableDistricts.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-950">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Pay Rate Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider">Min Pay Rate</label>
                      <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-sm">${minPay}.00/hr+</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      value={minPay}
                      onChange={(e) => setMinPay(Number(e.target.value))}
                      className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Distance Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider">Max Distance</label>
                      <span className="text-xs font-black bg-sky-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-sky-300 shadow-sm">{maxDistance.toFixed(1)} miles</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                      className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Schedule Conflict Filter Checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-[1.25rem] shadow-sm">
                    <input
                      type="checkbox"
                      id="schedule-filter"
                      checked={onlyMatchingSchedule}
                      onChange={(e) => setOnlyMatchingSchedule(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-2 border-indigo-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="schedule-filter" className="text-xs leading-snug text-indigo-950 cursor-pointer">
                      <span className="font-black block text-[11px] uppercase tracking-wider text-indigo-900 mb-0.5">Schedule Shield™ Active</span>
                      Only show jobs with zero class-schedule conflicts
                    </label>
                  </div>

                  {/* Category Selection Checklist */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block">Job Categories</label>
                    <div className="grid grid-cols-1 gap-2 bg-indigo-50/35 p-4 rounded-[1.25rem] border-2 border-indigo-100/50">
                      {Object.values(JobCategory).map((cat) => {
                        const checked = selectedCategories.includes(cat);
                        return (
                          <label key={cat} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:text-indigo-950 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleCategory(cat)}
                              className="w-4 h-4 rounded border-2 border-indigo-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>{cat}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active student location settings */}
                  <div className="border-t-2 border-indigo-100 pt-4 text-xs text-slate-600 leading-relaxed font-semibold">
                    <p className="font-black text-indigo-950 uppercase tracking-widest text-[9px] mb-1">Your Base Center:</p>
                    <p>Current setting: Campus Dorms at grid ({userCoords.x}, {userCoords.y}). All job distances dynamically recalculate relative to this center point.</p>
                  </div>
                </div>

                {/* Job Boards View Column */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {studentTab === "map" ? (
                    /* Display Map Component directly */
                    <div className="h-[520px]">
                      <MapComponent 
                        jobs={filteredJobs}
                        selectedJobId={selectedJobId}
                        onSelectJob={(id) => {
                          setSelectedJobId(id);
                          setStudentTab("board"); // bounce to view details
                        }}
                        userCoords={userCoords}
                        onUpdateUserCoords={setUserCoords}
                      />
                    </div>
                  ) : (
                    /* Display Grid Listings and Details Panel Side-by-Side/Stacked */
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Listings Col */}
                      <div className="md:col-span-5 space-y-3.5 h-[560px] overflow-y-auto pr-1">
                        {filteredJobs.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-medium">No part-time gigs match your active filters.</p>
                            <button
                              onClick={() => {
                                setSearchTerm("");
                                setSelectedCategories([]);
                                setMinPay(12);
                                setMaxDistance(5);
                                setOnlyMatchingSchedule(false);
                                setSelectedDistrict("All Districts");
                              }}
                              className="mt-3 text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                            >
                              Reset All Filters
                            </button>
                          </div>
                        ) : (
                          filteredJobs.map((job) => {
                            const isSelected = selectedJobId === job.id;
                            const hasConflict = checkScheduleOverlap(job.requiredSchedule, userProfile.busySchedule);
                            const alreadyApplied = studentApplications.some(app => app.jobId === job.id);
                            
                            return (
                              <div
                                key={job.id}
                                onClick={() => setSelectedJobId(job.id)}
                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                  isSelected 
                                    ? "bg-indigo-50/60 border-indigo-600 shadow-md ring-2 ring-indigo-950/20" 
                                    : "bg-white border-indigo-950 hover:border-indigo-600 shadow-sm"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-950 bg-amber-300 px-2.5 py-0.5 rounded-full border border-indigo-950 shadow-xs">
                                      {job.category}
                                    </span>
                                    <h4 className="font-display font-black text-indigo-950 text-xs sm:text-sm mt-2 leading-snug">{job.title}</h4>
                                    <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 flex-wrap">
                                      <span>{job.employer}</span>
                                      {job.district && (
                                        <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1 text-[9px] font-black uppercase">📍 {job.district}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-black text-slate-900 text-xs sm:text-sm text-emerald-700 block">
                                      ${job.payRate.toFixed(2)}/hr
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-950/50 block mt-0.5">
                                      {job.distance.toFixed(1)} mi away
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3.5 flex items-center justify-between flex-wrap gap-2 text-[10px]">
                                  {/* Schedule overlapping badges */}
                                  {hasConflict ? (
                                    <span className="inline-flex items-center gap-1 text-rose-900 font-black bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                      Conflict
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-900 font-black bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      Fits Class Hours
                                    </span>
                                  )}

                                  {alreadyApplied ? (
                                    <span className="font-black uppercase text-[9px] tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-0.5 rounded-full">Applied</span>
                                  ) : (
                                    <span className="text-slate-600 font-bold">{job.spotsRemaining} spots left</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>                      {/* Details Column Drawer */}
                      <div className="md:col-span-7 bg-white rounded-[2rem] border-4 border-indigo-950 p-6 shadow-xl h-[560px] overflow-y-auto">
                        {activeJob ? (
                          <div className="space-y-6">
                            <div>
                              <div className="flex justify-between items-center gap-2 flex-wrap">
                                <span className="bg-amber-300 text-indigo-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-2 border-indigo-950 shadow-sm">
                                  {activeJob.category}
                                </span>
                                <span className="text-xs font-bold text-slate-500">
                                  Posted {new Date(activeJob.postedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <h3 className="font-display font-black text-indigo-950 text-xl sm:text-2xl mt-3 leading-tight">{activeJob.title}</h3>
                              <p className="text-xs font-bold text-indigo-900/85 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                <span className="flex items-center gap-1.5">
                                  <Building className="w-4 h-4 text-indigo-600" />
                                  {activeJob.employer}
                                </span>
                                {activeJob.district && (
                                  <span className="flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                    📍 {activeJob.district}
                                  </span>
                                )}
                              </p>

                              {/* Exact Location & Google Maps Link card */}
                              <div className="mt-3.5 p-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-900 block font-mono">EXACT LOCATION</span>
                                  <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    {activeJob.locationName}
                                  </p>
                                </div>
                                {activeJob.googleMapsUrl && (
                                  <a
                                    href={activeJob.googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl border-2 border-indigo-950 shadow-[0_2px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all w-fit cursor-pointer shrink-0"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                    View on Google Maps
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Info Quick-Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 p-4 bg-indigo-50/50 rounded-[1.5rem] text-center border-2 border-indigo-950 shadow-xs">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-900 block">PAY RATE</span>
                                <span className="font-black text-emerald-700 text-sm sm:text-base block mt-0.5">${activeJob.payRate.toFixed(2)}/hr</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-900 block">DISTANCE</span>
                                <span className="font-black text-indigo-950 text-sm sm:text-base block mt-0.5">{activeJob.distance.toFixed(1)} miles</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-900 block">SPOTS</span>
                                <span className="font-black text-indigo-950 text-sm sm:text-base block mt-0.5">{activeJob.spotsRemaining} open</span>
                              </div>
                            </div>

                            {/* Job Timetable Schedule */}
                            <div>
                              <h5 className="font-display font-black text-indigo-950 uppercase tracking-widest text-[10px] mb-3">Required Shift Hours</h5>
                              <div className="flex flex-wrap gap-2">
                                {activeJob.requiredSchedule.map((slot, i) => (
                                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white text-indigo-950 border-2 border-indigo-950 rounded-xl shadow-xs">
                                    <Clock className="w-4 h-4 text-indigo-600" />
                                    {slot.day} - {slot.session.charAt(0).toUpperCase() + slot.session.slice(1)}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <h5 className="font-display font-black text-indigo-950 uppercase tracking-widest text-[10px] mb-3">Description</h5>
                              <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-indigo-50/20 p-4 rounded-[1.25rem] border-2 border-indigo-100">
                                {activeJob.description}
                              </p>
                            </div>

                            {/* Requirements Bullets */}
                            <div>
                              <h5 className="font-display font-black text-indigo-950 uppercase tracking-widest text-[10px] mb-3">Job Requirements</h5>
                              <ul className="grid grid-cols-1 gap-2 bg-indigo-50/10 p-4 rounded-[1.25rem] border-2 border-indigo-100/60">
                                {activeJob.requirements.map((req, i) => (
                                  <li key={i} className="text-xs font-semibold text-slate-700 flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{req}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* AI Cover Pitch Compiler Container */}
                            <AIPitchBuilder 
  job={activeJob}
  userProfile={userProfile}
  onApplyWithPitch={handleApply}
  isApplied={studentApplications.some(app => app.jobId === activeJob.id)}
/>

                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-indigo-50/20 rounded-[1.5rem] border-2 border-dashed border-indigo-200">
                            <Briefcase className="w-12 h-12 text-indigo-200 mb-3 animate-bounce" />
                            <p className="text-sm font-display font-black text-indigo-950 uppercase tracking-wide">Select a part-time job</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1 max-w-sm">Pick a gig from the list to view requirements, analyze schedule compatibility, and generate custom pitches using Gemini AI.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* Sub-tab 3: Student Schedule Planner Screen */}
            {studentTab === "scheduler" && (
              <div className="space-y-6">
                <ScheduleSelector 
                  busySchedule={userProfile.busySchedule}
                  onToggleSlot={handleToggleScheduleSlot}
                />

                {/* Profile Edit Board */}
                <div className="bg-white rounded-[2rem] border-4 border-indigo-950 p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
                    <div>
                      <h3 className="font-display font-black text-indigo-950 flex items-center gap-2 text-base sm:text-lg">
                        <User className="w-5 h-5 text-indigo-600" />
                        My Seeker Profile
                      </h3>
                      <p className="text-xs font-semibold text-slate-600">Provide details for the AI Pitch builder to customize your applications</p>
                    </div>
                    {!editingProfile && (
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="text-xs bg-amber-400 hover:bg-amber-500 text-indigo-950 border-2 border-indigo-950 font-black px-3.5 py-2 rounded-xl shadow-[0_2.5px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {editingProfile ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">Full Name</label>
                          <input
                            type="text"
                            value={profName}
                            onChange={(e) => setProfName(e.target.value)}
                            required
                            className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">Academic Major</label>
                          <input
                            type="text"
                            value={profMajor}
                            onChange={(e) => setProfMajor(e.target.value)}
                            required
                            className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">Academic Year</label>
                          <select
                            value={profYear}
                            onChange={(e) => setProfYear(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 font-bold"
                          >
                            <option value="Freshman">Freshman</option>
                            <option value="Sophomore">Sophomore</option>
                            <option value="Junior">Junior</option>
                            <option value="Senior">Senior</option>
                            <option value="Graduate">Graduate</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">Bio / Elevator Pitch</label>
                        <textarea
                          value={profBio}
                          onChange={(e) => setProfBio(e.target.value)}
                          rows={3}
                          required
                          className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 font-medium"
                        />
                      </div>

                      {/* Interactive Skill Tags Input */}
                      <div>
                        <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">
                          Skills Tags (Press Enter to add tag)
                        </label>
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={handleAddSkill}
                          placeholder="e.g. Tutoring, Catering, Biking..."
                          className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 font-medium mb-2"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {userProfile.skills.map((skill) => (
                            <span key={skill} className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 pl-3 pr-2 py-0.5 rounded-full">
                              {skill}
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill)}
                                className="hover:bg-indigo-200 rounded-full p-0.5 cursor-pointer text-indigo-500 hover:text-indigo-700 text-sm font-black leading-none"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingProfile(false)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 border-2 border-indigo-950 font-black text-indigo-950 px-4 py-2 rounded-xl shadow-[0_2.5px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="text-xs bg-emerald-500 hover:bg-emerald-600 text-indigo-950 border-2 border-indigo-950 font-black px-4 py-2 rounded-xl shadow-[0_2.5px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-xs text-slate-700">
                      <div className="space-y-4 sm:col-span-1 border-r-2 border-indigo-100 pr-4">
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-950/65 tracking-wider block mb-0.5">NAME</span>
                          <span className="font-display font-black text-indigo-950 text-base">{userProfile.name}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-950/65 tracking-wider block mb-0.5">MAJOR</span>
                          <span className="font-bold text-slate-800 text-xs">{userProfile.major} ({userProfile.year})</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-950/65 tracking-wider block mb-0.5">CONTACT</span>
                          <span className="font-semibold block">{userProfile.email}</span>
                          <span className="block mt-0.5 text-slate-500 font-medium">{userProfile.phone}</span>
                        </div>
                      </div>
                      <div className="sm:col-span-3 space-y-4">
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-950/65 tracking-wider block mb-1">PERSONAL STATEMENT</span>
                          <p className="leading-relaxed text-slate-700 bg-indigo-50/20 p-4 rounded-2xl border-2 border-indigo-100 font-semibold">{userProfile.bio}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-950/65 tracking-wider block mb-2">SKILLS INVENTORY</span>
                          <div className="flex flex-wrap gap-2">
                            {userProfile.skills.map((skill) => (
                              <span key={skill} className="text-[11px] font-bold bg-amber-300 text-indigo-950 border border-indigo-950 px-3 py-1 rounded-full shadow-sm">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab 4: Student Applications Tracker Screen */}
            {studentTab === "applications" && (
              <div className="bg-white rounded-[2rem] border-4 border-indigo-950 p-6 shadow-xl" id="student-applications-panel">
                <div className="mb-5">
                  <h3 className="font-display font-black text-indigo-950 flex items-center gap-2 text-base sm:text-lg">
                    <ClipboardList className="w-5 h-5 text-indigo-600 animate-pulse" />
                    My Job Applications Tracker
                  </h3>
                  <p className="text-xs font-semibold text-slate-600">Real-time status updates on submitted student gigs</p>
                </div>

                {studentApplications.length === 0 ? (
                  <div className="border-4 border-dashed border-indigo-200 rounded-[2rem] p-10 bg-indigo-50/10 text-center text-slate-500">
                    <Briefcase className="w-12 h-12 text-indigo-200 mx-auto mb-3 animate-pulse" />
                    <h4 className="font-display font-black text-indigo-950 uppercase tracking-wide text-sm sm:text-base">No applications submitted yet</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-1.5 max-w-sm mx-auto">
                      Explore the job listings page, use our AI-powered helper to craft your custom pitch, and submit your first gig application!
                    </p>
                    <button
                      onClick={() => setStudentTab("board")}
                      className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border-2 border-indigo-950 shadow-[0_2.5px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                    >
                      Browse Jobs Board
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5">
                    {studentApplications.map((app) => {
                      const job = jobs.find(j => j.id === app.jobId);
                      if (!job) return null;

                      const statusColors = {
                        pending: { bg: "bg-amber-100 text-amber-950 border-amber-400", label: "Pending Review" },
                        interviewing: { bg: "bg-blue-100 text-blue-950 border-blue-400", label: "Interviewing" },
                        hired: { bg: "bg-emerald-100 text-emerald-950 border-emerald-400", label: "✓ Hired! Congrats!" },
                        declined: { bg: "bg-slate-100 text-slate-700 border-slate-300", label: "Declined" }
                      };

                      const currentStatus = statusColors[app.status] || statusColors.pending;

                      return (
                        <div key={app.id} className="border-2 border-indigo-950 rounded-2xl p-5 bg-white flex flex-col md:flex-row justify-between gap-4 shadow-sm">
                          <div className="flex-1 space-y-3">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-950 bg-amber-300 px-2.5 py-0.5 rounded-full border border-indigo-950 shadow-xs">
                                  {job.category}
                                </span>
                                <h4 className="font-display font-black text-indigo-950 text-sm sm:text-base mt-2 leading-none">{job.title}</h4>
                                <p className="text-xs font-bold text-slate-600 mt-1">{job.employer} • {job.locationName}</p>
                              </div>
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full border-2 ${currentStatus.bg} shadow-xs`}>
                                {currentStatus.label}
                              </span>
                            </div>

                            <div className="bg-indigo-50/20 p-4 rounded-xl border-2 border-indigo-100/70 text-xs text-slate-700 leading-relaxed shadow-inner">
                              <div className="text-[10px] font-black text-indigo-950 uppercase mb-1.5 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
                                Submitted AI Pitch Cover Letter
                              </div>
                              <div className="whitespace-pre-wrap font-sans font-medium text-slate-600">{app.coverLetter}</div>
                            </div>
                          </div>

                          <div className="md:w-48 text-right flex flex-col justify-between items-end shrink-0 border-t-2 md:border-t-0 md:border-l-2 border-indigo-100 pt-3 md:pt-0 md:pl-4">
                            <div className="text-xs">
                              <span className="text-slate-500 block font-bold text-[10px] uppercase tracking-wider mb-0.5">Job Pay</span>
                              <span className="font-black text-emerald-700 text-sm sm:text-base">${job.payRate.toFixed(2)}/hr</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold">
                              Applied on {new Date(app.appliedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ==============================================
            ROLE 2: EMPLOYER WORKSPACE
            ============================================== */}
        {currentRole === "employer" && (
          <div className="space-y-6">
            
            {/* Employer subtabs */}
            <div className="flex border-b-4 border-indigo-950 gap-2 pb-px">
              <button
                onClick={() => setEmployerTab("posted")}
                className={`pb-3 px-5 text-xs font-black uppercase tracking-widest border-b-4 transition-all cursor-pointer ${
                  employerTab === "posted"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-indigo-950"
                }`}
              >
                My Posted Jobs ({employerJobs.length})
              </button>
              <button
                onClick={() => setEmployerTab("create")}
                className={`pb-3 px-5 text-xs font-black uppercase tracking-widest border-b-4 transition-all cursor-pointer flex items-center gap-1.5 ${
                  employerTab === "create"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-indigo-950"
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Post a New Gig
              </button>
            </div>

            {/* Employer Tab 1: Manage Gigs & Applicants */}
            {employerTab === "posted" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Posted Jobs sidebar */}
                <div className="lg:col-span-5 space-y-3.5 h-[520px] overflow-y-auto pr-1">
                  <h3 className="font-display font-black text-indigo-950 text-xs sm:text-sm px-1 mb-2 uppercase tracking-wider">My Active Gig Postings</h3>
                  
                  {employerJobs.map((job) => {
                    const isSelected = selectedJobId === job.id;
                    const count = (applicationsByJob[job.id] || []).length;

                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-indigo-50/60 border-indigo-600 shadow-md ring-2 ring-indigo-950/20"
                            : "bg-white border-indigo-950 hover:border-indigo-600 shadow-sm"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-950 bg-amber-300 px-2.5 py-0.5 rounded-full border border-indigo-950 shadow-xs">
                              {job.category}
                            </span>
                            <h4 className="font-display font-black text-indigo-950 text-xs sm:text-sm mt-2 leading-snug">{job.title}</h4>
                            <p className="text-[11px] font-bold text-slate-600">
                              {job.employer} • {job.locationName}
                              {job.district && <span className="text-indigo-600 font-extrabold"> ({job.district})</span>}
                            </p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border-2 border-indigo-950 ${
                            count > 0 ? "bg-indigo-100 text-indigo-950 shadow-xs" : "bg-slate-50 text-slate-500"
                          }`}>
                            {count} Applicants
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Candidate applicants list panel */}
                <div className="lg:col-span-7 bg-white rounded-[2rem] border-4 border-indigo-950 p-6 shadow-xl min-h-[480px]">
                  {activeJob ? (
                    <div className="space-y-6">
                      <div className="border-b-2 border-indigo-100 pb-4">
                        <span className="bg-amber-300 text-indigo-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-2 border-indigo-950 shadow-xs">
                          {activeJob.category}
                        </span>
                        <h3 className="font-display font-black text-indigo-950 text-base sm:text-lg mt-2 leading-tight">{activeJob.title}</h3>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">Reviewing student applicants for this gig</p>
                      </div>

                      {/* Applicants List */}
                      {(!applicationsByJob[activeJob.id] || applicationsByJob[activeJob.id].length === 0) ? (
                        <div className="py-12 text-center bg-indigo-50/10 border-2 border-dashed border-indigo-200 rounded-[1.5rem]">
                          <UserCheck className="w-12 h-12 text-indigo-200 mx-auto mb-3" />
                          <h4 className="font-display font-black text-indigo-950 uppercase tracking-wide text-sm">No Applicants Yet</h4>
                          <p className="text-xs font-semibold text-slate-500 mt-1 max-w-xs mx-auto">
                            Switch to Student Mode to mock-apply for this gig using our Gemini cover letter drafter.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {applicationsByJob[activeJob.id].map((app) => (
                            <div key={app.id} className="border-2 border-indigo-950 rounded-2xl p-5 bg-white space-y-4 shadow-sm">
                              <div className="flex flex-wrap justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-display font-black text-indigo-950 text-sm">{app.applicantProfile.name}</h4>
                                  <p className="text-[11px] font-bold text-slate-600">{app.applicantProfile.major} ({app.applicantProfile.year})</p>
                                </div>
                                
                                {/* Status Pill & Action Buttons */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {app.status === "pending" && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateStatus(app.id, "interviewing")}
                                        className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-2 border-indigo-950 font-black px-2.5 py-1.5 rounded-lg shadow-[0_2px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
                                      >
                                        Interview
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(app.id, "hired")}
                                        className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-indigo-950 border-2 border-indigo-950 font-black px-2.5 py-1.5 rounded-lg shadow-[0_2px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
                                      >
                                        Hire
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(app.id, "declined")}
                                        className="text-[10px] bg-rose-500 hover:bg-rose-600 text-white border-2 border-indigo-950 font-black px-2.5 py-1.5 rounded-lg shadow-[0_2px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
                                      >
                                        Decline
                                      </button>
                                    </>
                                  )}
                                  {app.status === "interviewing" && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-black bg-blue-100 text-blue-950 px-2.5 py-1 rounded-full border-2 border-blue-400 shadow-xs">
                                        Interviewing
                                      </span>
                                      <button
                                        onClick={() => handleUpdateStatus(app.id, "hired")}
                                        className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-indigo-950 border-2 border-indigo-950 font-black px-2.5 py-1 rounded-lg shadow-[0_2px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
                                      >
                                        Hire
                                      </button>
                                    </div>
                                  )}
                                  {app.status === "hired" && (
                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-full border-2 border-emerald-400 shadow-xs">
                                      Hired
                                    </span>
                                  )}
                                  {app.status === "declined" && (
                                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300">
                                      Declined
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Student Cover Pitch letter */}
                              <div className="bg-indigo-50/20 p-4 rounded-xl border-2 border-indigo-100 text-xs text-slate-700 leading-relaxed shadow-inner">
                                <div className="text-[9px] font-black text-indigo-950 uppercase mb-1.5 flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
                                  Applicant's Cover Pitch (AI Optimized)
                                </div>
                                <div className="whitespace-pre-wrap font-medium text-slate-600">{app.coverLetter}</div>
                              </div>

                              {/* Student Contact Info */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 font-bold">
                                <span>📧 {app.applicantProfile.email}</span>
                                <span>📞 {app.applicantProfile.phone}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-indigo-50/20 rounded-[1.5rem] border-2 border-dashed border-indigo-200">
                      <Building className="w-12 h-12 text-indigo-200 mb-3 animate-bounce" />
                      <p className="text-sm font-display font-black text-indigo-950 uppercase tracking-wide">Select an active job</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1 max-w-sm">Pick one of your active postings to inspect student applications and review their custom cover letter pitches.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Employer Tab 2: Create a New Job Post Form */}
            {employerTab === "create" && (
              <div className="bg-white rounded-[2rem] border-4 border-indigo-950 p-6 shadow-xl max-w-3xl mx-auto">
                <div className="mb-5 border-b-2 border-indigo-100 pb-4">
                  <h3 className="font-display font-black text-indigo-950 text-base sm:text-lg flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-indigo-600" />
                    Post a Flexible Student Gig
                  </h3>
                  <p className="text-xs font-semibold text-slate-600">Describe the shift hours, pay, and location details to attract students</p>
                </div>

                <form onSubmit={handleCreateJob} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Job Title *</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Wedding Banquet Catering Team"
                        className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Company / Poster Name *</label>
                      <input
                        type="text"
                        required
                        value={newEmployer}
                        onChange={(e) => setNewEmployer(e.target.value)}
                        placeholder="e.g. Acme Event Management"
                        className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Job Category *</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as JobCategory)}
                        className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-black cursor-pointer"
                      >
                        {Object.values(JobCategory).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Pay Rate ($/hr) *</label>
                      <input
                        type="number"
                        required
                        min="10"
                        max="100"
                        value={newPay}
                        onChange={(e) => setNewPay(Number(e.target.value))}
                        className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Available Spots *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="20"
                        value={newSpots}
                        onChange={(e) => setNewSpots(Number(e.target.value))}
                        className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Location Name *</label>
                      <input
                        type="text"
                        required
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g. Student Union Hall (0.2 mi)"
                        className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">District / Place *</label>
                      <input
                        type="text"
                        required
                        value={newDistrict}
                        onChange={(e) => setNewDistrict(e.target.value)}
                        placeholder="e.g. Campus, Downtown"
                        className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Map Plot Center (X/Y)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="10"
                          max="90"
                          value={newMapX}
                          onChange={(e) => setNewMapX(Number(e.target.value))}
                          placeholder="X: 10-90"
                          className="w-full text-xs px-2 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl text-center text-indigo-950 font-black"
                        />
                        <input
                          type="number"
                          min="10"
                          max="90"
                          value={newMapY}
                          onChange={(e) => setNewMapY(Number(e.target.value))}
                          placeholder="Y: 10-90"
                          className="w-full text-xs px-2 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl text-center text-indigo-950 font-black"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
                      Google Maps Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={newGoogleMapsUrl}
                      onChange={(e) => setNewGoogleMapsUrl(e.target.value)}
                      placeholder="e.g. https://maps.app.goo.gl/xyz or https://maps.google.com/?q=address"
                      className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                    />
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">
                      Paste the Google Maps share link so students can view exact location coordinates/directions instantly.
                    </p>
                  </div>

                  {/* Required Hours Multi-Selector */}
                  <div>
                    <label className="text-[10px] font-black text-indigo-950 block mb-1 uppercase tracking-wider">Required Shift Schedule *</label>
                    <p className="text-[11px] font-semibold text-slate-500 mb-3">Select the slots where the student has to work (e.g. Friday Evening)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {(["Monday", "Wednesday", "Friday", "Saturday", "Sunday"] as DayOfWeek[]).map((day) => {
                        const hasMorning = newScheduleSlots.some(s => s.day === day && s.session === "morning");
                        const hasAfternoon = newScheduleSlots.some(s => s.day === day && s.session === "afternoon");
                        const hasEvening = newScheduleSlots.some(s => s.day === day && s.session === "evening");

                        return (
                          <div key={day} className="p-3 border-2 border-indigo-950 rounded-2xl bg-indigo-50/15 text-[11px] space-y-2">
                            <span className="font-display font-black text-indigo-950 block border-b-2 border-indigo-100 pb-1 mb-1.5">{day}</span>
                            <div className="flex flex-col gap-1.5">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 select-none">
                                <input
                                  type="checkbox"
                                  checked={hasMorning}
                                  onChange={() => handleToggleNewJobSchedule(day, "morning")}
                                  className="rounded shrink-0 border-indigo-950 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                                />
                                Morning
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 select-none">
                                <input
                                  type="checkbox"
                                  checked={hasAfternoon}
                                  onChange={() => handleToggleNewJobSchedule(day, "afternoon")}
                                  className="rounded shrink-0 border-indigo-950 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                                />
                                Afternoon
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 select-none">
                                <input
                                  type="checkbox"
                                  checked={hasEvening}
                                  onChange={() => handleToggleNewJobSchedule(day, "evening")}
                                  className="rounded shrink-0 border-indigo-950 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                                />
                                Evening
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Gig Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="e.g. Set up catering trays, serve drinks to banquet guests, clean up dining floor..."
                      className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-indigo-950 block mb-1.5 uppercase tracking-wider">Bullet Requirements (One per line)</label>
                    <textarea
                      rows={2}
                      value={newRequirements}
                      onChange={(e) => setNewRequirements(e.target.value)}
                      placeholder="e.g. Prior customer service skill is helpful&#10;Must be able to stand for 4 hours&#10;Punctual and reliable"
                      className="w-full text-xs px-3.5 py-3 bg-slate-50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEmployerTab("posted")}
                      className="text-xs bg-slate-100 hover:bg-slate-200 border-2 border-indigo-950 px-4 py-2.5 rounded-xl text-indigo-950 font-black cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold border-2 border-indigo-950 shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Post Gig Board Listing
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ==============================================
          AUTHENTICATION MODAL
          ============================================== */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/60 backdrop-blur-xs p-4 overflow-y-auto" style={{ zIndex: 9999 }} id="auth-modal-overlay">
          <div className="bg-white rounded-[2rem] border-4 border-indigo-950 p-6 sm:p-8 max-w-md w-full shadow-2xl relative" id="auth-modal-card">
            {/* Close button */}
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-indigo-950 transition-colors text-xl font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto border-2 border-indigo-950 shadow-md mb-3">
                <Briefcase className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-indigo-950">
                {isSignUpMode ? "Create Account" : "Welcome Back!"}
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {isSignUpMode ? "Register to start finding and posting part-time gigs" : "Sign in to manage your gigs and custom pitches"}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs rounded-2xl flex flex-col gap-2 shadow-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <p className="font-black text-rose-900">Authentication Error</p>
                    <p className="font-semibold text-[11px] opacity-90 mt-0.5">{authError}</p>
                  </div>
                </div>

                {isAuthNotAllowed && (
                  <div className="mt-3 pt-3 border-t-2 border-rose-200 space-y-2 text-[11px]">
                    <p className="font-black text-indigo-950 uppercase tracking-wider text-[10px]">How to fix this in Firebase:</p>
                    <ol className="list-decimal list-inside pl-1 space-y-1.5 text-slate-700 font-semibold leading-relaxed">
                      <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-black hover:underline">Firebase Console &rarr;</a></li>
                      <li>Select your project: <code className="bg-slate-100 text-indigo-900 px-1 py-0.5 rounded-md font-mono text-[10px]">gen-lang-client-0713365361</code></li>
                      <li>Go to <strong className="text-indigo-950">Build &gt; Authentication</strong> in the left menu</li>
                      <li>Click the <strong className="text-indigo-950">Sign-in method</strong> tab at the top</li>
                      <li>Click <strong className="text-indigo-950">Add new provider</strong>, select <strong className="text-indigo-950">Email/Password</strong> and click <strong className="text-indigo-950">Enable</strong> (and Save)</li>
                      <li>Refresh this page and register!</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isSignUpMode && (
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Alex Carter"
                    className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="alex.carter@university.edu"
                  className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-indigo-950 tracking-wider block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-indigo-950 font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-indigo-950 shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? "Processing..." : isSignUpMode ? "Register & Sign Up" : "Sign In to Account"}
              </button>
            </form>

            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-indigo-100"></div>
              </div>
              <span className="relative bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">or</span>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              type="button"
              className="w-full bg-white hover:bg-amber-50 text-indigo-950 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-indigo-950 shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              Sign In with Google (No Setup)
            </button>

            <div className="mt-6 pt-4 border-t-2 border-indigo-100 text-center text-xs">
              {isSignUpMode ? (
                <p className="text-slate-600 font-semibold">
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setIsSignUpMode(false);
                      setAuthError(null);
                      setIsAuthNotAllowed(false);
                    }}
                    className="text-indigo-600 font-black hover:underline cursor-pointer"
                  >
                    Log In
                  </button>
                </p>
              ) : (
                <p className="text-slate-600 font-semibold">
                  Don't have an account?{" "}
                  <button
                    onClick={() => {
                      setIsSignUpMode(true);
                      setAuthError(null);
                      setIsAuthNotAllowed(false);
                    }}
                    className="text-indigo-600 font-black hover:underline cursor-pointer"
                  >
                    Register Here
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decorative footer */}
      <footer className="bg-indigo-950 border-t-4 border-indigo-950 py-8 mt-16 text-center text-xs text-indigo-200">
        <div className="max-w-7xl mx-auto px-4 space-y-1 font-sans">
          <p className="font-display font-black uppercase tracking-wider text-amber-300">Campus GigFinder Network Inc.</p>
          <p className="font-semibold text-[11px] opacity-85">All student hours, geographical coordinates, and custom cover letters compiled securely server-side.</p>
        </div>
      </footer>
    </div>
  );
}
