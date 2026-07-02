/* =========================================================
   Reemora — data store
   Client-side "database" backed by localStorage so the admin
   pages, catalog and homepage all read/write the same data.

   NOTE FOR PRODUCTION: localStorage is per-browser and is not
   a substitute for a real database. Swap ReemoraStore's
   internals for calls to Supabase (or any backend) without
   touching the pages that consume it — every page only talks
   to the methods below.
   ========================================================= */

(function (global) {
  const STORAGE_KEY = 'reemora_courses_v1';
  const ADMIN_KEY = 'reemora_admin_session';
  const ADMIN_PASSWORD_KEY = 'reemora_admin_password';
  const DEFAULT_ADMIN_PASSWORD = 'Reemora@2026';

  const SEED_COURSES = [
    {
      id: 'ai-app-bootcamp',
      title: 'AI App Development Bootcamp',
      category: 'AI Development',
      level: 'Intermediate',
      durationWeeks: 6,
      price: 450,
      currency: 'KWD',
      image: '',
      shortDescription: 'Design, build and ship a full AI-powered application from scratch using modern no-code and low-code AI tools.',
      description: 'A hands-on bootcamp where you will design, build and deploy a complete AI-powered application. You will learn to integrate large language models, connect APIs, design clean user interfaces, and launch a working product by the end of the course.',
      curriculum: [
        'Foundations of AI-assisted app building',
        'Prompt engineering for product features',
        'Connecting AI models to real applications via APIs',
        'UI/UX design for AI products',
        'Deploying and launching your app'
      ],
      instructor: 'Reemora Certified Trainer',
      startDate: '2026-08-10',
      endDate: '2026-09-21',
      sessionDays: 'Sun, Tue',
      sessionTime: '6:00 PM - 9:00 PM',
      seatsTotal: 20,
      seatsAvailable: 12,
      status: 'upcoming'
    },
    {
      id: 'prompt-engineering-pro',
      title: 'Prompt Engineering for Developers',
      category: 'AI Skills',
      level: 'Beginner',
      durationWeeks: 3,
      price: 180,
      currency: 'KWD',
      image: '',
      shortDescription: 'Master the art and science of writing prompts that get reliable, production-ready results from AI models.',
      description: 'Learn structured prompting techniques, few-shot examples, chain-of-thought design, and evaluation methods to reliably get high quality output from AI models in real products.',
      curriculum: [
        'How large language models interpret prompts',
        'Structured prompting patterns',
        'Few-shot and chain-of-thought techniques',
        'Testing and evaluating prompt quality',
        'Building reusable prompt libraries'
      ],
      instructor: 'Reemora Certified Trainer',
      startDate: '2026-08-03',
      endDate: '2026-08-24',
      sessionDays: 'Mon, Wed',
      sessionTime: '5:00 PM - 7:00 PM',
      seatsTotal: 25,
      seatsAvailable: 25,
      status: 'upcoming'
    },
    {
      id: 'ai-agents-automation',
      title: 'Building AI Agents & Automations',
      category: 'AI Development',
      level: 'Advanced',
      durationWeeks: 5,
      price: 380,
      currency: 'KWD',
      image: '',
      shortDescription: 'Build autonomous AI agents that plan, use tools, and automate multi-step business workflows.',
      description: 'Go beyond chat interfaces and learn to design AI agents that can reason, call tools, and automate real workflows end-to-end. Covers agent architecture, tool-calling, memory, and safe deployment practices.',
      curriculum: [
        'Agent architecture and reasoning loops',
        'Tool-calling and function integration',
        'Memory and context management',
        'Multi-agent workflows',
        'Safety, guardrails and deployment'
      ],
      instructor: 'Reemora Certified Trainer',
      startDate: '2026-09-01',
      endDate: '2026-10-06',
      sessionDays: 'Sat',
      sessionTime: '10:00 AM - 2:00 PM',
      seatsTotal: 16,
      seatsAvailable: 9,
      status: 'upcoming'
    },
    {
      id: 'nocode-ai-apps',
      title: 'No-Code AI Apps for Entrepreneurs',
      category: 'No-Code',
      level: 'Beginner',
      durationWeeks: 4,
      price: 220,
      currency: 'KWD',
      image: '',
      shortDescription: 'Turn your idea into a working AI-powered app without writing a single line of code.',
      description: 'Perfect for founders and business owners. Learn to combine no-code platforms with AI building blocks to launch functional products quickly, without a technical background.',
      curriculum: [
        'Choosing the right no-code stack',
        'Wiring AI features into no-code apps',
        'Databases, logic and automations',
        'Launch checklist and monetization'
      ],
      instructor: 'Reemora Certified Trainer',
      startDate: '2026-07-20',
      endDate: '2026-08-10',
      sessionDays: 'Tue, Thu',
      sessionTime: '6:30 PM - 8:30 PM',
      seatsTotal: 22,
      seatsAvailable: 4,
      status: 'upcoming'
    }
  ];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_COURSES));
        return JSON.parse(JSON.stringify(SEED_COURSES));
      }
      return JSON.parse(raw);
    } catch (e) {
      return JSON.parse(JSON.stringify(SEED_COURSES));
    }
  }

  function persist(courses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }

  function slugify(text) {
    return text.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'course';
  }

  function uniqueId(base) {
    const courses = load();
    let id = slugify(base);
    let n = 2;
    while (courses.some(c => c.id === id)) {
      id = `${slugify(base)}-${n}`;
      n++;
    }
    return id;
  }

  const ReemoraStore = {
    getCourses() {
      return load();
    },
    getCourseById(id) {
      return load().find(c => c.id === id) || null;
    },
    addCourse(course) {
      const courses = load();
      const newCourse = Object.assign({
        id: uniqueId(course.title || 'course'),
        status: 'upcoming',
        seatsAvailable: course.seatsTotal || 0
      }, course);
      newCourse.id = uniqueId(course.title || 'course');
      courses.push(newCourse);
      persist(courses);
      return newCourse;
    },
    updateCourse(id, updates) {
      const courses = load();
      const idx = courses.findIndex(c => c.id === id);
      if (idx === -1) return null;
      courses[idx] = Object.assign({}, courses[idx], updates);
      persist(courses);
      return courses[idx];
    },
    deleteCourse(id) {
      const courses = load().filter(c => c.id !== id);
      persist(courses);
    },
    resetToDefaults() {
      persist(JSON.parse(JSON.stringify(SEED_COURSES)));
    },

    // ---- Admin session (client-side gate only — replace with real auth in production) ----
    isAdminLoggedIn() {
      return sessionStorage.getItem(ADMIN_KEY) === 'true';
    },
    login(password) {
      const stored = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
      if (password === stored) {
        sessionStorage.setItem(ADMIN_KEY, 'true');
        return true;
      }
      return false;
    },
    logout() {
      sessionStorage.removeItem(ADMIN_KEY);
    },
    changePassword(newPassword) {
      localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
    },
    getDefaultPasswordHint() {
      return DEFAULT_ADMIN_PASSWORD;
    },

    // ---- Registrations (stored locally; production should post these to a backend) ----
    getRegistrations() {
      try {
        return JSON.parse(localStorage.getItem('reemora_registrations') || '[]');
      } catch (e) { return []; }
    },
    addRegistration(reg) {
      const regs = this.getRegistrations();
      regs.push(Object.assign({ id: 'REG-' + Date.now(), createdAt: new Date().toISOString() }, reg));
      localStorage.setItem('reemora_registrations', JSON.stringify(regs));
      return regs[regs.length - 1];
    }
  };

  global.ReemoraStore = ReemoraStore;
})(window);
