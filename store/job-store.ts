import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job } from '@/types';

// Mock data
const mockJobs: Job[] = [
  {
    id: 'j1',
    role: 'Campus Ambassador',
    company: 'ConneKtx',
    logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea',
    location: 'Pune',
    type: 'Full-time',
    salary: 'Unpaid',
    experience: '0 years',
    skills: ['Communication', 'Networking', 'Event Management', 'Social Media'],
    description: 'Join ConneKtx as a Campus Ambassador to represent our brand on campus, drive student engagement, and organize outreach initiatives.',
    applicationLink: 'https://forms.gle/ZirwVUWYsJiNQgLQ8',
    postedAt: '2025-10-01T00:00:00Z',
    deadline: '2025-11-01T00:00:00Z',
    isBookmarked: false,
    postedBy: 'user1',
    applications: [],
    companyDetails: {
      name: 'ConneKtx',
      size: '1-10',
      address: 'Pune',
      contactPerson: {
        name: 'HR Team',
        email: 'hr@connektx.com',
        phone: '+91 0000000000'
      }
    }
  },
  {
    id: 'j2',
    role: 'React Native Developer',
    company: 'ConneKtx',
    logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea',
    location: 'Pune',
    type: 'Full-time',
    salary: 'Unpaid',
    experience: '0 years',
    skills: ['React Native', 'JavaScript', 'TypeScript', 'Redux'],
    description: 'Work with the ConneKtx team to build and maintain cross-platform mobile applications using React Native.',
    applicationLink: 'https://forms.gle/6smNquDVDYhLg8tt7',
    postedAt: '2025-10-01T00:00:00Z',
    deadline: '2025-11-01T00:00:00Z',
    isBookmarked: false,
    postedBy: 'user1',
    applications: [],
    companyDetails: {
      name: 'ConneKtx',
      size: '1-10',
      address: 'Pune',
      contactPerson: {
        name: 'HR Team',
        email: 'hr@connektx.com',
        phone: '+91 0000000000'
      }
    }
  },
  {
    id: 'j3',
    role: 'Digital Marketing Associate',
    company: 'ConneKtx',
    logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea',
    location: 'Pune',
    type: 'Full-time',
    salary: 'Unpaid',
    experience: '0 years',
    skills: ['SEO', 'Content Marketing', 'Social Media', 'Analytics'],
    description: 'Help plan and execute digital marketing campaigns for ConneKtx across social, content, and SEO channels.',
    applicationLink: 'https://forms.gle/LqKwek7L23mkPyF29',
    postedAt: '2025-10-01T00:00:00Z',
    deadline: '2025-11-01T00:00:00Z',
    isBookmarked: false,
    postedBy: 'user1',
    applications: [],
    companyDetails: {
      name: 'ConneKtx',
      size: '1-10',
      address: 'Pune',
      contactPerson: {
        name: 'HR Team',
        email: 'hr@connektx.com',
        phone: '+91 0000000000'
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