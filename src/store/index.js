/**
 * Global app store using Zustand.
 * Keeps auth state, domain list, and scan results.
 * Persists auth to localStorage so login survives refresh.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

// ── Auth store ───────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (email, _password) => {
        // In production: call /api/auth/login — using mock for now
        const user = { id: '1', email, org: email.split('@')[1] || 'My Organization', role: 'admin' };
        set({ user, isAuthenticated: true });
        return { ok: true };
      },

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'cyberguard-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ── Scan store ───────────────────────────────────────────────
export const useScanStore = create((set, get) => ({
  // Domain being monitored
  domains: [],
  activeDomain: null,

  // Scan state
  scanStatus: 'idle', // 'idle' | 'scanning' | 'success' | 'error'
  scanError: null,
  scanProgress: [],   // array of { step, status, message }

  // Results
  results: null,      // full scan result object

  // ── Actions ────────────────────────────────────────────────

  addDomain: (domain) => {
    const trimmed = domain.toLowerCase().trim();
    set((s) => ({
      domains: s.domains.includes(trimmed) ? s.domains : [...s.domains, trimmed],
      activeDomain: trimmed,
    }));
  },

  setActiveDomain: (domain) => set({ activeDomain: domain }),

  /** Run a full scan — updates progress as each step completes */
  runScan: async (domain) => {
    set({
      scanStatus: 'scanning',
      scanError: null,
      scanProgress: [
        { step: 'dns', label: 'DNS records', status: 'running' },
        { step: 'email', label: 'Email security', status: 'pending' },
        { step: 'ssl', label: 'SSL certificates', status: 'pending' },
        { step: 'score', label: 'Computing score', status: 'pending' },
      ],
    });

    try {
      // Step 1: DNS
      const dnsRes = await api.dns.scan(domain);
      set((s) => ({
        scanProgress: s.scanProgress.map(p =>
          p.step === 'dns' ? { ...p, status: dnsRes.ok ? 'done' : 'error', error: dnsRes.error } :
          p.step === 'email' ? { ...p, status: 'running' } : p
        ),
      }));

      // Step 2: Email
      const emailRes = await api.email.scan(domain);
      set((s) => ({
        scanProgress: s.scanProgress.map(p =>
          p.step === 'email' ? { ...p, status: emailRes.ok ? 'done' : 'error', error: emailRes.error } :
          p.step === 'ssl' ? { ...p, status: 'running' } : p
        ),
      }));

      // Step 3: SSL
      const sslRes = await api.ssl.scan(domain);
      set((s) => ({
        scanProgress: s.scanProgress.map(p =>
          p.step === 'ssl' ? { ...p, status: sslRes.ok ? 'done' : 'error', error: sslRes.error } :
          p.step === 'score' ? { ...p, status: 'running' } : p
        ),
      }));

      // Compute combined results
      const dns = dnsRes.data || { score: 0, issues: [], records: {} };
      const email = emailRes.data || { score: 0, issues: [], records: {} };
      const ssl = sslRes.data || { score: 0, issues: [], certificate: null };

      const combinedScore = Math.round(
        (dns.score * 0.25 + email.score * 0.35 + ssl.score * 0.20 + 60 * 0.20) * 10
      );
      const grade = combinedScore >= 900 ? 'A+' : combinedScore >= 800 ? 'A' : combinedScore >= 700 ? 'B+' : combinedScore >= 600 ? 'B' : combinedScore >= 500 ? 'C' : combinedScore >= 400 ? 'D' : 'F';

      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const allIssues = [
        ...(dns.issues || []).map(i => ({ ...i, scanner: 'DNS' })),
        ...(email.issues || []).map(i => ({ ...i, scanner: 'Email' })),
        ...(ssl.issues || []).map(i => ({ ...i, scanner: 'SSL' })),
      ].sort((a, b) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4));

      const results = {
        domain,
        score: combinedScore,
        grade,
        scores: { dns: dns.score, email: email.score, ssl: ssl.score, vuln: 60 },
        results: { dns, email, ssl },
        allIssues,
        criticalCount: allIssues.filter(i => i.severity === 'critical').length,
        highCount: allIssues.filter(i => i.severity === 'high').length,
        scannedAt: new Date().toISOString(),
      };

      set((s) => ({
        scanStatus: 'success',
        results,
        scanProgress: s.scanProgress.map(p => ({ ...p, status: 'done' })),
      }));

    } catch (err) {
      console.error('[store] Scan failed:', err);
      set({ scanStatus: 'error', scanError: err.message || 'Scan failed unexpectedly' });
    }
  },

  clearResults: () => set({ results: null, scanStatus: 'idle', scanError: null, scanProgress: [] }),
}));

// ── UI store ─────────────────────────────────────────────────
export const useUIStore = create((set) => ({
  activePage: 'overview',
  sidebarCollapsed: false,
  notifications: [],

  setActivePage: (page) => set({ activePage: page }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  addNotification: (msg, type = 'info') => set((s) => ({
    notifications: [...s.notifications, { id: Date.now(), msg, type, ts: new Date() }]
  })),
  clearNotification: (id) => set((s) => ({
    notifications: s.notifications.filter(n => n.id !== id)
  })),
}));
