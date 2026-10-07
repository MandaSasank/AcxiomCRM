import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Code,
  FileCheck2,
} from 'lucide-react';

export const AcceptanceTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const runAcceptanceTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch('/api/tests/run-acceptance', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setTestResults(json.results || []);
        setSummary({
          total: json.totalTests,
          passed: json.passedCount,
          failed: json.failedCount,
        });
      }
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSeed = async () => {
    try {
      const res = await fetch('/api/tests/reset-seed', { method: 'POST' });
      if (res.ok) {
        setResetMessage('Database successfully reset to initial baseline seed data.');
        setTimeout(() => setResetMessage(null), 4000);
        runAcceptanceTests();
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  useEffect(() => {
    runAcceptanceTests();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Acceptance Scenarios Test Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official Section 17.19 Acceptance Checklist: Automated real-time verification of all 14 mandatory acceptance scenarios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetSeed}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Restore baseline database records"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Baseline Seed
          </button>
          <button
            onClick={runAcceptanceTests}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Executing Tests...' : 'Run All 14 Acceptance Tests'}
          </button>
        </div>
      </div>

      {resetMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Summary Scorecard */}
      {summary && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                summary.failed === 0
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-rose-100 text-rose-700 border border-rose-300'
              }`}
            >
              {summary.failed === 0 ? '100%' : `${Math.round((summary.passed / summary.total) * 100)}%`}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Evaluation Status: {summary.failed === 0 ? 'ALL SCENARIOS PASSED' : 'ATTENTION REQUIRED'}
              </h2>
              <p className="text-xs text-slate-500">
                {summary.passed} of {summary.total} acceptance verification suites verified against server endpoints.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {summary.passed} Passed
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              {summary.failed} Failed
            </span>
          </div>
        </div>
      )}

      {/* Test Scenarios Checklist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            PDF Section 17.19 Acceptance Matrix
          </span>
          <span className="text-xs text-slate-500">
            Automated Server-Side & Business Rule Validations
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {testResults.map(test => {
            const isPassed = test.status === 'PASSED';
            return (
              <div
                key={test.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Scenario #{test.id}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {test.category}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900">{test.scenario}</h3>
                    <p className="text-xs text-slate-600">{test.details}</p>

                    {test.evidence && (
                      <details className="pt-1 text-[11px] text-slate-500">
                        <summary className="cursor-pointer hover:text-blue-600 font-medium">
                          Inspect Test Evidence Payload
                        </summary>
                        <pre className="mt-1.5 p-2 bg-slate-900 text-emerald-400 rounded-md font-mono text-[10px] overflow-x-auto">
                          {JSON.stringify(test.evidence, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                <div className="self-end md:self-start shrink-0">
                  <span
                    className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${
                      isPassed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
