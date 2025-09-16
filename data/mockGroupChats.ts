// Mock data for group chats in community chat rooms
// This file provides realistic mock chat conversations for different communities

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  type?: 'normal' | 'system' | 'announcement';
}

export interface GroupChatData {
  communityId: string;
  messages: ChatMessage[];
}

// Mock users for chat conversations
const mockUsers = {
  user_1: {
    id: 'user_1',
    name: 'Rajesh Kumar',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  user_2: {
    id: 'user_2',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  user_3: {
    id: 'user_3',
    name: 'Amit Singh',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  user_4: {
    id: 'user_4',
    name: 'Sneha Reddy',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  },
  user_5: {
    id: 'user_5',
    name: 'Vikram Patel',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
  },
  user_6: {
    id: 'user_6',
    name: 'Aarti Gupta',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face'
  },
  user_7: {
    id: 'user_7',
    name: 'Rohan Verma',
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face'
  },
  user_8: {
    id: 'user_8',
    name: 'Kavya Iyer',
    avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face'
  },
  user_9: {
    id: 'user_9',
    name: 'Arjun Kapoor',
    avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face'
  },
  user_10: {
    id: 'user_10',
    name: 'Divya Jain',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face'
  }
};

// Helper function to generate timestamps
const getTimestamp = (hoursAgo: number, minutesAgo: number = 0) => {
  return new Date(Date.now() - (hoursAgo * 3600000) - (minutesAgo * 60000)).toISOString();
};

// Mock chat data for AI Builders India community
const aiBuildersChatMessages: ChatMessage[] = [
  {
    id: 'msg_ai_1',
    content: 'Welcome everyone to the AI Builders India chat room! 🎉',
    createdAt: getTimestamp(24, 15),
    sender: mockUsers.user_1,
    type: 'announcement'
  },
  {
    id: 'msg_ai_2',
    content: 'Hey everyone! Just deployed my first GPT-based chatbot. The response quality is amazing!',
    createdAt: getTimestamp(4, 30),
    sender: mockUsers.user_2
  },
  {
    id: 'msg_ai_3',
    content: 'That\'s awesome @Priya! Which framework did you use?',
    createdAt: getTimestamp(4, 25),
    sender: mockUsers.user_3
  },
  {
    id: 'msg_ai_4',
    content: 'I used LangChain with OpenAI\'s API. The integration was surprisingly smooth.',
    createdAt: getTimestamp(4, 20),
    sender: mockUsers.user_2
  },
  {
    id: 'msg_ai_5',
    content: 'Has anyone worked with Hugging Face transformers for local deployment?',
    createdAt: getTimestamp(3, 45),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_ai_6',
    content: 'Yes! I\'ve deployed BERT models locally. Performance is great once you optimize the batch size.',
    createdAt: getTimestamp(3, 40),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_ai_7',
    content: 'Can you share your optimization approach? I\'m struggling with inference speed.',
    createdAt: getTimestamp(3, 35),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_ai_8',
    content: 'Sure! Key points: 1) Use ONNX runtime 2) Quantization 3) Dynamic batching. I can share my code later.',
    createdAt: getTimestamp(3, 30),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_ai_9',
    content: 'That would be incredibly helpful! 🙏',
    createdAt: getTimestamp(3, 28),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_ai_10',
    content: 'Anyone attending the AI conference in Mumbai next month?',
    createdAt: getTimestamp(2, 15),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_ai_11',
    content: 'I\'ll be there! Looking forward to the computer vision workshops.',
    createdAt: getTimestamp(2, 10),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_ai_12',
    content: 'Same here! We should organize a community meetup during the conference.',
    createdAt: getTimestamp(2, 5),
    sender: mockUsers.user_1
  },
  {
    id: 'msg_ai_13',
    content: 'Great idea! I can help coordinate. Let\'s create a separate thread for planning.',
    createdAt: getTimestamp(2, 2),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_ai_14',
    content: 'Just pushed my latest ML project to GitHub. It\'s a sentiment analysis tool for social media posts.',
    createdAt: getTimestamp(1, 45),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_ai_15',
    content: 'Cool! What accuracy are you getting?',
    createdAt: getTimestamp(1, 42),
    sender: mockUsers.user_3
  },
  {
    id: 'msg_ai_16',
    content: 'About 87% on my test dataset. Still working on improving it with data augmentation.',
    createdAt: getTimestamp(1, 38),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_ai_17',
    content: 'Have you tried using ensemble methods? They can boost accuracy significantly.',
    createdAt: getTimestamp(1, 35),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_ai_18',
    content: 'Not yet, but that\'s my next step! Any specific techniques you\'d recommend?',
    createdAt: getTimestamp(1, 30),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_ai_19',
    content: 'Try combining LSTM, BERT, and traditional ML models like Random Forest. Voting classifier works well.',
    createdAt: getTimestamp(1, 25),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_ai_20',
    content: 'Thanks for the tip! I\'ll experiment with that approach.',
    createdAt: getTimestamp(1, 20),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_ai_21',
    content: 'Quick reminder: Our weekly AI paper discussion is tomorrow at 7 PM IST 📚',
    createdAt: getTimestamp(0, 45),
    sender: mockUsers.user_1,
    type: 'announcement'
  },
  {
    id: 'msg_ai_22',
    content: 'What paper are we discussing this week?',
    createdAt: getTimestamp(0, 40),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_ai_23',
    content: 'We\'re covering "Attention Is All You Need" - the transformer paper. Classic but foundational!',
    createdAt: getTimestamp(0, 35),
    sender: mockUsers.user_1
  },
  {
    id: 'msg_ai_24',
    content: 'Perfect timing! I\'ve been working on implementing attention mechanisms.',
    createdAt: getTimestamp(0, 30),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_ai_25',
    content: 'Looking forward to the discussion! Always learn something new from these sessions.',
    createdAt: getTimestamp(0, 15),
    sender: mockUsers.user_2
  }
];

// Mock chat data for Startup Founders Delhi community
const startupFoundersChatMessages: ChatMessage[] = [
  {
    id: 'msg_startup_1',
    content: 'Welcome to Startup Founders Delhi! Let\'s build the future together 🚀',
    createdAt: getTimestamp(48),
    sender: mockUsers.user_3,
    type: 'announcement'
  },
  {
    id: 'msg_startup_2',
    content: 'Just closed our seed round! $500K to scale our EdTech platform.',
    createdAt: getTimestamp(6, 20),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_startup_3',
    content: 'Congratulations! 🎉 That\'s fantastic news. How long did the fundraising process take?',
    createdAt: getTimestamp(6, 15),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_startup_4',
    content: 'About 8 months from start to finish. The key was having solid traction metrics.',
    createdAt: getTimestamp(6, 10),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_startup_5',
    content: 'Any tips for someone just starting the fundraising journey?',
    createdAt: getTimestamp(6, 5),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_startup_6',
    content: 'Focus on product-market fit first. VCs want to see real user engagement, not just downloads.',
    createdAt: getTimestamp(6, 2),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_startup_7',
    content: 'Also, get warm introductions whenever possible. Cold emails rarely work.',
    createdAt: getTimestamp(5, 55),
    sender: mockUsers.user_3
  },
  {
    id: 'msg_startup_8',
    content: 'Speaking of networking, is anyone going to the Delhi Startup Week next month?',
    createdAt: getTimestamp(4, 30),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_startup_9',
    content: 'I\'ll be there! Planning to attend the pitch competition.',
    createdAt: getTimestamp(4, 25),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_startup_10',
    content: 'Same! We should organize a community booth. Great way to showcase our members\' startups.',
    createdAt: getTimestamp(4, 20),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_startup_11',
    content: 'I love that idea! How do we get started with organizing something like that?',
    createdAt: getTimestamp(4, 15),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_startup_12',
    content: 'I can reach out to the event organizers. I know someone on their team.',
    createdAt: getTimestamp(4, 10),
    sender: mockUsers.user_3
  },
  {
    id: 'msg_startup_13',
    content: 'That would be amazing! Count me in for helping with setup and coordination.',
    createdAt: getTimestamp(4, 5),
    sender: mockUsers.user_1
  },
  {
    id: 'msg_startup_14',
    content: 'Quick question: Has anyone dealt with GST registration for their startup?',
    createdAt: getTimestamp(3, 20),
    sender: mockUsers.user_2
  },
  {
    id: 'msg_startup_15',
    content: 'Yes, we did it last year. It\'s straightforward but time-consuming. DM me if you need specific help.',
    createdAt: getTimestamp(3, 15),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_startup_16',
    content: 'Thanks! The compliance part of running a startup is definitely the least fun 😅',
    createdAt: getTimestamp(3, 10),
    sender: mockUsers.user_2
  },
  {
    id: 'msg_startup_17',
    content: 'Tell me about it! But it\'s necessary. Better to get it right from the beginning.',
    createdAt: getTimestamp(3, 8),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_startup_18',
    content: 'Anyone hiring full-stack developers? My startup is looking to expand our tech team.',
    createdAt: getTimestamp(2, 40),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_startup_19',
    content: 'We just hired two developers through AngelList. Great platform for startup hiring.',
    createdAt: getTimestamp(2, 35),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_startup_20',
    content: 'I\'ll check that out. We\'ve been using traditional job boards without much luck.',
    createdAt: getTimestamp(2, 30),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_startup_21',
    content: 'Also try reaching out to coding bootcamp graduates. Many are eager to join startups.',
    createdAt: getTimestamp(2, 25),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_startup_22',
    content: 'Just launched our beta version! Would love to get feedback from fellow founders.',
    createdAt: getTimestamp(1, 50),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_startup_23',
    content: 'What\'s your startup about? Always excited to try new products from the community!',
    createdAt: getTimestamp(1, 45),
    sender: mockUsers.user_1
  },
  {
    id: 'msg_startup_24',
    content: 'We\'re building a SaaS platform for small business inventory management. Super niche but huge problem.',
    createdAt: getTimestamp(1, 40),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_startup_25',
    content: 'That sounds really useful! Small businesses definitely need better tech solutions.',
    createdAt: getTimestamp(1, 35),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_startup_26',
    content: 'I\'d be happy to test it out. My family runs a retail store and they struggle with inventory tracking.',
    createdAt: getTimestamp(1, 30),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_startup_27',
    content: 'Perfect! I\'ll DM you the beta access link. Real user feedback is invaluable.',
    createdAt: getTimestamp(1, 25),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_startup_28',
    content: 'This is why I love this community. Always supporting each other! 💪',
    createdAt: getTimestamp(0, 45),
    sender: mockUsers.user_3
  },
  {
    id: 'msg_startup_29',
    content: 'Absolutely! Speaking of support, is anyone interested in a co-working session tomorrow?',
    createdAt: getTimestamp(0, 30),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_startup_30',
    content: 'I\'m in! Where are you thinking? Somewhere in CP?',
    createdAt: getTimestamp(0, 25),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_startup_31',
    content: 'Yeah, there\'s a good co-working space near Rajiv Chowk. I can share details in a bit.',
    createdAt: getTimestamp(0, 20),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_startup_32',
    content: 'Count me in too! Nothing beats working alongside fellow entrepreneurs.',
    createdAt: getTimestamp(0, 15),
    sender: mockUsers.user_2
  }
];

// Mock chat data for BTech Placement Prep community
const btechPlacementChatMessages: ChatMessage[] = [
  {
    id: 'msg_btech_1',
    content: 'BTech 2025 Placement Prep starts here! Let\'s ace those interviews together 💪',
    createdAt: getTimestamp(72),
    sender: mockUsers.user_4,
    type: 'announcement'
  },
  {
    id: 'msg_btech_2',
    content: 'Just had my Microsoft interview! They asked a lot about system design.',
    createdAt: getTimestamp(8, 30),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_btech_3',
    content: 'How did it go? System design is my weak area 😅',
    createdAt: getTimestamp(8, 25),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_btech_4',
    content: 'It went okay! They asked me to design a chat application. Started with basic architecture.',
    createdAt: getTimestamp(8, 20),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_btech_5',
    content: 'That\'s a classic question! Did you cover scalability aspects?',
    createdAt: getTimestamp(8, 15),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_btech_6',
    content: 'Yes! Load balancing, database sharding, caching with Redis. The interviewer seemed impressed.',
    createdAt: getTimestamp(8, 10),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_btech_7',
    content: 'Awesome! Fingers crossed for your result 🤞',
    createdAt: getTimestamp(8, 5),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_btech_8',
    content: 'Can someone help me with dynamic programming? I keep getting confused with memoization.',
    createdAt: getTimestamp(7, 40),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_btech_9',
    content: 'Sure! The key is to identify overlapping subproblems. Start with recursive solution, then optimize.',
    createdAt: getTimestamp(7, 35),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_btech_10',
    content: 'I find it helpful to draw the recursion tree first. Makes the overlapping parts obvious.',
    createdAt: getTimestamp(7, 30),
    sender: mockUsers.user_3
  },
  {
    id: 'msg_btech_11',
    content: 'That\'s a great approach! Visual representation definitely helps with understanding.',
    createdAt: getTimestamp(7, 25),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_btech_12',
    content: 'Google interview tomorrow! Any last-minute tips?',
    createdAt: getTimestamp(6, 15),
    sender: mockUsers.user_1
  },
  {
    id: 'msg_btech_13',
    content: 'Stay calm and think out loud! They want to see your problem-solving process.',
    createdAt: getTimestamp(6, 10),
    sender: mockUsers.user_2
  },
  {
    id: 'msg_btech_14',
    content: 'And don\'t forget to ask clarifying questions. Shows you think about edge cases.',
    createdAt: getTimestamp(6, 8),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_btech_15',
    content: 'Thanks everyone! This community has been so helpful throughout prep.',
    createdAt: getTimestamp(6, 5),
    sender: mockUsers.user_1
  },
  {
    id: 'msg_btech_16',
    content: 'You\'ve got this! 🔥',
    createdAt: getTimestamp(6, 3),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_btech_17',
    content: 'Just got an offer from Amazon! Package is 42 LPA 🎉',
    createdAt: getTimestamp(3, 20),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_btech_18',
    content: 'OMG congratulations! 🥳 That\'s amazing!',
    createdAt: getTimestamp(3, 18),
    sender: mockUsers.user_8
  },
  {
    id: 'msg_btech_19',
    content: 'Incredible! You totally deserved it. All those late-night coding sessions paid off!',
    createdAt: getTimestamp(3, 15),
    sender: mockUsers.user_3
  },
  {
    id: 'msg_btech_20',
    content: 'Thanks guys! Couldn\'t have done it without this community\'s support and study groups.',
    createdAt: getTimestamp(3, 12),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_btech_21',
    content: 'Can you share your interview experience? What topics did they focus on?',
    createdAt: getTimestamp(3, 8),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_btech_22',
    content: 'Mostly data structures, algorithms, and system design. Also asked about my projects in detail.',
    createdAt: getTimestamp(3, 5),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_btech_23',
    content: 'System design seems to be trending in most interviews now.',
    createdAt: getTimestamp(3, 2),
    sender: mockUsers.user_6
  },
  {
    id: 'msg_btech_24',
    content: 'Definitely! I spent a lot of time on Grokking the System Design Interview. Highly recommend.',
    createdAt: getTimestamp(2, 58),
    sender: mockUsers.user_9
  },
  {
    id: 'msg_btech_25',
    content: 'Study group session tomorrow at 3 PM? We can practice mock interviews.',
    createdAt: getTimestamp(2, 30),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_btech_26',
    content: 'I\'m in! Need practice with behavioral questions.',
    createdAt: getTimestamp(2, 25),
    sender: mockUsers.user_7
  },
  {
    id: 'msg_btech_27',
    content: 'Perfect! I\'ll create a meet link and share it here.',
    createdAt: getTimestamp(2, 20),
    sender: mockUsers.user_4
  },
  {
    id: 'msg_btech_28',
    content: 'Anyone know good resources for learning about distributed systems?',
    createdAt: getTimestamp(1, 45),
    sender: mockUsers.user_2
  },
  {
    id: 'msg_btech_29',
    content: 'Designing Data-Intensive Applications by Martin Kleppmann is excellent!',
    createdAt: getTimestamp(1, 40),
    sender: mockUsers.user_10
  },
  {
    id: 'msg_btech_30',
    content: 'Also check out MIT\'s distributed systems course on YouTube. Theory + practical examples.',
    createdAt: getTimestamp(1, 35),
    sender: mockUsers.user_1
  },
  {
    id: 'msg_btech_31',
    content: 'Thanks! Adding both to my reading list. So much to learn, so little time 😅',
    createdAt: getTimestamp(1, 30),
    sender: mockUsers.user_2
  },
  {
    id: 'msg_btech_32',
    content: 'You\'re doing great! Consistency is key. A little progress each day adds up.',
    createdAt: getTimestamp(0, 20),
    sender: mockUsers.user_5
  },
  {
    id: 'msg_btech_33',
    content: 'Motivation Monday: Remember why you started. Your dream job is within reach! 🎯',
    createdAt: getTimestamp(0, 10),
    sender: mockUsers.user_4,
    type: 'system'
  }
];

// Additional communities with shorter chat histories
const communityChats: GroupChatData[] = [
  // AI Builders India
  {
    communityId: 'community_1',
    messages: aiBuildersChatMessages
  },
  // Startup Founders Delhi  
  {
    communityId: 'community_2',
    messages: startupFoundersChatMessages
  },
  // BTech 2025 Placement Prep
  {
    communityId: 'community_3',
    messages: btechPlacementChatMessages
  }
];

// Utility function to get chat messages for a specific community
export const getCommunityGroupChat = (communityId: string): ChatMessage[] => {
  const communityChat = communityChats.find(chat => chat.communityId === communityId);
  return communityChat?.messages || [];
};

// Utility function to get all group chats
export const getAllGroupChats = (): GroupChatData[] => {
  return communityChats;
};

// Function to generate realistic system messages
export const generateSystemMessage = (type: 'join' | 'leave' | 'admin', userName: string, timestamp: string): ChatMessage => {
  const messages = {
    join: `${userName} joined the community`,
    leave: `${userName} left the community`,
    admin: `${userName} was promoted to admin`
  };

  return {
    id: `system_${Date.now()}_${Math.random()}`,
    content: messages[type],
    createdAt: timestamp,
    sender: { id: 'system', name: 'System' },
    type: 'system'
  };
};

// Function to add a new message to a community chat
export const addMessageToCommunityChat = (communityId: string, message: ChatMessage) => {
  const chatIndex = communityChats.findIndex(chat => chat.communityId === communityId);
  if (chatIndex !== -1) {
    communityChats[chatIndex].messages.push(message);
  }
};

// Default export for easy importing
export default {
  getCommunityGroupChat,
  getAllGroupChats,
  generateSystemMessage,
  addMessageToCommunityChat,
  mockUsers
};
