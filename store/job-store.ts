import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job } from '@/types';

// Mock data
const mockJobs: Job[] = [
  {
    id: 'j1',
    role: 'React Native Developer',
    company: 'ConnektX',
    logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea',
    location: 'Pune',
    type: 'Full-time',
    salary: 'Unpaid',
    experience: '0 years',
    skills: ['React Native', 'JavaScript', 'TypeScript', 'Redux', 'Android', 'iOS'],
    description: 'Join our dynamic team as a React Native Developer! You will be responsible for developing high-quality mobile applications for both Android and iOS platforms. Work on exciting projects that reach millions of users and collaborate with a passionate team of developers and designers.',
    postedAt: '2025-09-22T10:00:00Z',
    deadline: '2025-10-22T10:00:00Z',
    isBookmarked: false,
    postedBy: 'user1',
    applications: [
      {
        id: 'a1',
        applicantId: 'user2',
        name: 'Priya Patel',
        email: 'priya.patel@example.com',
        phone: '+91 9876543210',
        experience: '3 years',
        coverLetter: 'I am excited to apply for the React Native Developer position at ConnektX. As a fresh graduate passionate about mobile app development, I am eager to learn and contribute to your team using React Native.',
        resume: 'https://example.com/priya-resume.pdf',
        appliedAt: '2024-12-21T14:30:00Z',
        status: 'reviewing'
      },
      {
        id: 'a2',
        applicantId: 'user3',
        name: 'Arjun Kumar',
        email: 'arjun.kumar@example.com',
        phone: '+91 9876543211',
        experience: '2.5 years',
        coverLetter: 'I have been working with React Native for 2.5 years and have published multiple apps on both Play Store and App Store. I am passionate about creating seamless mobile experiences.',
        resume: 'https://example.com/arjun-resume.pdf',
        appliedAt: '2024-12-22T09:15:00Z',
        status: 'pending'
      }
    ],
    companyDetails: {
      name: 'ConnektX',
      size: '50-200',
      address: 'Hinjewadi, Pune',
      contactPerson: {
        name: 'HR Team',
        email: 'hr@connektx.com',
        phone: '+91 9876543212'
      }
    }
  },
  {
    id: 'j2',
    role: 'Digital Marketing Associate',
    company: 'ConnektX',
    logo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    location: 'Pune',
    type: 'Full-time',
    salary: 'Unpaid',
    experience: '0 years',
    skills: ['Google Ads', 'Facebook Ads', 'SEO', 'Content Marketing', 'Analytics', 'Social Media'],
    description: 'We are seeking a creative and data-driven Digital Marketing Associate to join our team. You will manage social media campaigns, create engaging content, run PPC campaigns, and analyze performance metrics to drive growth for our clients across various industries.',
    postedAt: '2025-09-22T11:00:00Z',
    deadline: '2025-10-22T11:00:00Z',
    isBookmarked: true,
    postedBy: 'user2',
    applications: [
      {
        id: 'a4',
        applicantId: 'user4',
        name: 'Sneha Reddy',
        email: 'sneha.reddy@example.com',
        phone: '+91 9876543216',
        experience: '1.5 years',
        coverLetter: 'I am passionate about digital marketing and eager to learn about social media campaigns and Google Ads. As a fresh graduate, I would love to contribute to ConnektX\'s growth.',
        resume: 'https://example.com/sneha-resume.pdf',
        appliedAt: '2024-12-20T16:45:00Z',
        status: 'pending'
      }
    ],
    companyDetails: {
      name: 'ConnektX',
      size: '50-200',
      address: 'Hinjewadi, Pune',
      contactPerson: {
        name: 'HR Team',
        email: 'hr@connektx.com',
        phone: '+91 9876543213'
      }
    }
  },
  {
    id: 'j3',
    role: 'Campus Ambassador',
    company: 'ConnektX',
    logo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
    location: 'Pune',
    type: 'Part-time',
    salary: 'Unpaid',
    experience: '0 years',
    skills: ['Communication', 'Leadership', 'Event Management', 'Social Media', 'Networking'],
    description: 'Be the face of ConnektX at your campus! As a Campus Ambassador, you will organize events, workshops, and promotional activities. Perfect opportunity for students to gain leadership experience, build networks, and learn while studying. Flexible hours and great learning opportunities.',
    postedAt: '2025-09-22T12:00:00Z',
    deadline: '2025-10-22T12:00:00Z',
    isBookmarked: false,
    postedBy: 'user3',
    applications: [
      {
        id: 'a5',
        applicantId: 'user5',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@student.com',
        phone: '+91 9876543217',
        experience: 'Final Year Student',
        coverLetter: 'I am a final year Computer Science student with strong leadership skills. I have organized multiple college events and would love to represent ConnektX on my campus.',
        resume: 'https://example.com/aarav-resume.pdf',
        appliedAt: '2024-12-19T10:30:00Z',
        status: 'reviewing'
      },
      {
        id: 'a6',
        applicantId: 'user6',
        name: 'Kavya Nair',
        email: 'kavya.nair@student.com',
        phone: '+91 9876543218',
        experience: 'Second Year Student',
        coverLetter: 'I am an enthusiastic second-year MBA student with excellent communication skills and experience in social media marketing. I believe I can effectively promote ConnektX among students.',
        resume: 'https://example.com/kavya-resume.pdf',
        appliedAt: '2024-12-20T15:20:00Z',
        status: 'pending'
      }
    ],
    companyDetails: {
      name: 'ConnektX',
      size: '50-200',
      address: 'Hinjewadi, Pune',
      contactPerson: {
        name: 'HR Team',
        email: 'hr@connektx.com',
        phone: '+91 9876543215'
      }
    }
  }
];

interface JobFilters {
  type: string[];
  location: string[];
  experience: string[];
}

export interface JobState {
  jobs: Job[];
  filteredJobs: Job[];
  filters: JobFilters;
  isLoading: boolean;
  error: string | null;
  fetchJobs: () => Promise<void>;
  fetchJobById: (id: string) => Promise<Job | null>;
  applyToJob: (jobId: string, application: any) => Promise<boolean>;
  bookmarkJob: (jobId: string) => Promise<void>;
  applyFilters: (filters: Partial<JobFilters>) => void;
  resetFilters: () => void;
  createJob: (job: Job) => Promise<void>;
}

export const useJobStore = create<JobState>()(
  persist(
    (set, get) => ({
      jobs: mockJobs,
      filteredJobs: mockJobs,
      filters: {
        type: [],
        location: [],
        experience: []
      },
      isLoading: false,
      error: null,
      
      fetchJobs: async () => {
        set({ isLoading: true, error: null });
        try {
          // In a real app, you would fetch from an API
          // For now, we'll just use the mock data
          set({ jobs: mockJobs, filteredJobs: mockJobs, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch jobs', isLoading: false });
        }
      },
      
      fetchJobById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // In a real app, you would fetch from an API
          // For now, we'll just find in the mock data
          const job = get().jobs.find(j => j.id === id);
          set({ isLoading: false });
          return job || null;
        } catch (error) {
          set({ error: 'Failed to fetch job', isLoading: false });
          return null;
        }
      },
      
      applyToJob: async (jobId: string, application: any) => {
        set({ isLoading: true, error: null });
        try {
          // In a real app, you would make an API call
          // For now, we'll just update the local state
          const jobs = [...get().jobs];
          const jobIndex = jobs.findIndex(j => j.id === jobId);
          
          if (jobIndex === -1) {
            set({ error: 'Job not found', isLoading: false });
            return false;
          }
          
          const job = { ...jobs[jobIndex] };
          
          // Add application
          job.applications = [
            ...job.applications,
            {
              id: `a${Date.now()}`,
              ...application,
              appliedAt: new Date().toISOString(),
              status: 'pending'
            }
          ];
          
          jobs[jobIndex] = job;
          set({ jobs, filteredJobs: get().filteredJobs, isLoading: false });
          return true;
        } catch (error) {
          set({ error: 'Failed to apply to job', isLoading: false });
          return false;
        }
      },
      
      bookmarkJob: async (jobId: string) => {
        set({ isLoading: true, error: null });
        try {
          // In a real app, you would make an API call
          // For now, we'll just update the local state
          const jobs = [...get().jobs];
          const jobIndex = jobs.findIndex(j => j.id === jobId);
          
          if (jobIndex === -1) {
            set({ error: 'Job not found', isLoading: false });
            return;
          }
          
          const job = { ...jobs[jobIndex] };
          job.isBookmarked = !job.isBookmarked;
          
          jobs[jobIndex] = job;
          set({ jobs, filteredJobs: get().filteredJobs, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to bookmark job', isLoading: false });
        }
      },
      
      applyFilters: (filters: Partial<JobFilters>) => {
        const currentFilters = { ...get().filters };
        const updatedFilters = { ...currentFilters, ...filters };
        
        // Filter jobs
        let filteredJobs = [...get().jobs];
        
        if (updatedFilters.type.length > 0) {
          filteredJobs = filteredJobs.filter(job => 
            updatedFilters.type.includes(job.type)
          );
        }
        
        if (updatedFilters.location.length > 0) {
          filteredJobs = filteredJobs.filter(job => 
            updatedFilters.location.includes(job.location)
          );
        }
        
        if (updatedFilters.experience.length > 0) {
          filteredJobs = filteredJobs.filter(job => 
            updatedFilters.experience.includes(job.experience)
          );
        }
        
        set({ filters: updatedFilters, filteredJobs });
      },
      
      resetFilters: () => {
        set({ 
          filters: {
            type: [],
            location: [],
            experience: []
          },
          filteredJobs: get().jobs
        });
      },
      
      createJob: async (job: Job) => {
        set({ isLoading: true, error: null });
        try {
          // In a real app, you would make an API call
          // For now, we'll just update the local state
          const jobs = [...get().jobs, job];
          set({ 
            jobs, 
            filteredJobs: get().filters.type.length > 0 || 
                          get().filters.location.length > 0 || 
                          get().filters.experience.length > 0 
                          ? get().filteredJobs 
                          : jobs, 
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to create job', isLoading: false });
        }
      }
    }),
    {
      name: 'job-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);