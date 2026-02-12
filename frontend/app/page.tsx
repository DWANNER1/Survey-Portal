"use client";

import { SignedIn, UserButton, useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";

import ChartPanel from "../components/ChartPanel";
import FilterPanel from "../components/FilterPanel";
import {
  DistributionPoint,
  FilterOptions,
  SavedView,
  Study,
  TimePoint,
  createSavedView,
  deleteSavedView,
  exportCsv,
  getDistribution,
  getFilterOptions,
  getSavedViews,
  getStudies,
  getTimeseries,
} from "../lib/api";

const QUESTIONS = [
  { code: "regulatory_pressure", label: "Regulatory Pressure" },
  { code: "policy_confidence", label: "Policy Confidence" },
];

const DISTRIBUTION_DIMENSIONS = ["industry", "region", "gender", "vote"];

export default function HomePage() {
  const { getToken } = useAuth();
  const getAuthToken = async () => getToken();
  const [studies, setStudies] = useState<Study[]>([]);
  const [studyId, setStudyId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({
    industry: "",
    region: "",
    gender: "",
    vote: "",
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    industry: [],
    region: [],
    gender: [],
    vote: [],
  });
  const [questionCode, setQuestionCode] = useState<string>(QUESTIONS[0].code);
  const [distributionDimension, setDistributionDimension] = useState<string>("industry");
  const [timeseries, setTimeseries] = useState<TimePoint[]>([]);
  const [distribution, setDistribution] = useState<DistributionPoint[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [newViewName, setNewViewName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const activeStudy = useMemo(() => studies.find((s) => s.id === studyId) || null, [studies, studyId]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        const allStudies = await getStudies();
        setStudies(allStudies);
        if (allStudies.length > 0) {
          setStudyId(allStudies[0].id);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (!studyId) return;
    async function loadFiltersAndViews() {
      try {
        const [options, views] = await Promise.all([getFilterOptions(studyId), getSavedViews(studyId, getAuthToken)]);
        setFilterOptions(options);
        setSavedViews(views);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    loadFiltersAndViews();
  }, [studyId]);

  useEffect(() => {
    if (!studyId) return;
    async function loadData() {
      try {
        setLoading(true);
        const [ts, dist] = await Promise.all([
          getTimeseries(studyId, questionCode, filters),
          getDistribution(studyId, questionCode, distributionDimension, filters),
        ]);
        setTimeseries(ts);
        setDistribution(dist);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studyId, questionCode, distributionDimension, filters]);

  function onFilterChange(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function onSaveView() {
    if (!studyId || !newViewName.trim()) return;
    try {
      await createSavedView(
        {
          study_id: studyId,
          name: newViewName.trim(),
          question_code: questionCode,
          distribution_dimension: distributionDimension,
          filters,
        },
        getAuthToken
      );
      setNewViewName("");
      const views = await getSavedViews(studyId, getAuthToken);
      setSavedViews(views);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function onLoadView(view: SavedView) {
    setQuestionCode(view.question_code);
    setDistributionDimension(view.distribution_dimension);
    setFilters({
      industry: view.filters.industry || "",
      region: view.filters.region || "",
      gender: view.filters.gender || "",
      vote: view.filters.vote || "",
    });
  }

  async function onDeleteView(viewId: number) {
    if (!studyId) return;
    try {
      await deleteSavedView(viewId, getAuthToken);
      const views = await getSavedViews(studyId, getAuthToken);
      setSavedViews(views);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onExportCsv() {
    if (!studyId) return;
    try {
      const file = await exportCsv(studyId, questionCode, distributionDimension, filters, getAuthToken);
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `study-${studyId}-${questionCode}-${distributionDimension}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container">
      <header className="hero">
        <div className="heroTop">
          <div>
            <p className="eyebrow">Subscriber Intelligence Portal</p>
            <h1>Interactive Survey Analytics</h1>
          </div>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        <p>
          Explore how views shift across industry, region, gender, and voter alignment. Save favorite cuts and export
          evidence-ready CSVs instantly.
        </p>
      </header>

      <section className="panel controls">
        <div className="control">
          <label>Study</label>
          <select value={studyId ?? ""} onChange={(e) => setStudyId(Number(e.target.value))}>
            {studies.map((study) => (
              <option key={study.id} value={study.id}>
                {study.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control">
          <label>Question</label>
          <select value={questionCode} onChange={(e) => setQuestionCode(e.target.value)}>
            {QUESTIONS.map((q) => (
              <option key={q.code} value={q.code}>
                {q.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control">
          <label>Distribution By</label>
          <select value={distributionDimension} onChange={(e) => setDistributionDimension(e.target.value)}>
            {DISTRIBUTION_DIMENSIONS.map((dim) => (
              <option key={dim} value={dim}>
                {dim}
              </option>
            ))}
          </select>
        </div>
      </section>

      {activeStudy && (
        <FilterPanel options={filterOptions} filters={filters} onFilterChange={onFilterChange} studyLabel={activeStudy.name} />
      )}

      <section className="panel savedViews">
        <div className="panelHeader">
          <h2>Saved Views</h2>
          <p>Persist high-value slices for recurring subscriber workflows.</p>
        </div>
        <div className="savedViewCreate">
          <input
            type="text"
            placeholder="Name this view"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
          />
          <button onClick={onSaveView}>Save Current View</button>
          <button className="outline" onClick={onExportCsv}>
            Export CSV
          </button>
        </div>
        <div className="savedViewList">
          {savedViews.length === 0 ? (
            <p className="muted">No saved views yet.</p>
          ) : (
            savedViews.map((view) => (
              <div className="savedViewItem" key={view.id}>
                <div>
                  <strong>{view.name}</strong>
                  <p className="muted">
                    {view.question_code} | by {view.distribution_dimension}
                  </p>
                </div>
                <div className="savedViewActions">
                  <button className="outline" onClick={() => onLoadView(view)}>
                    Load
                  </button>
                  <button className="danger" onClick={() => onDeleteView(view.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Loading data...</p>
      ) : (
        <ChartPanel
          timeseries={timeseries}
          distribution={distribution}
          questionCode={questionCode}
          selectedDimension={distributionDimension}
        />
      )}
    </main>
  );
}
