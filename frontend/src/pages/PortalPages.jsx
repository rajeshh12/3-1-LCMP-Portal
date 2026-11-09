import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../contexts/AuthContext.jsx";
import { api } from "../services/api.js";

const colors = [
  "#5d76a0",
  "#78a794",
  "#d0a96b",
  "#9b85bc",
  "#d68c7d",
  "#8ba6bf",
  "#b2a1a1",
];
const money = (value) => new Intl.NumberFormat("en-IN").format(value);
const dateText = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
const statusClass = (text = "") =>
  `status status-${String(text)
    .toLowerCase()
    .replace(/[\s_]+/g, "-")}`;

function useLoad(url, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    api
      .get(url)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [url, refreshKey]);
  return {
    data,
    error,
    reload: () =>
      setData((value) =>
        value === null ? null : [...(Array.isArray(value) ? value : [])],
      ),
  };
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="page-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, note, Icon, tone = "blue" }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">
          <Icon size={18} />
        </div>
      </div>
      <strong>{value ?? "—"}</strong>
      <small>{note}</small>
    </div>
  );
}

function Loading() {
  return (
    <div className="loading-panel">
      <div className="spinner" />
      Loading workspace data…
    </div>
  );
}
function Empty({
  title = "Nothing here yet",
  detail = "Records will appear here once they are added.",
}) {
  return (
    <div className="empty-state">
      <div>
        <FileText size={22} />
      </div>
      <b>{title}</b>
      <span>{detail}</span>
    </div>
  );
}
function ErrorNotice({ error }) {
  return error ? (
    <div className="alert error">
      <CircleAlert size={16} />
      {error}
    </div>
  ) : null;
}

export function Dashboard() {
  const { user } = useAuth();
  const { data, error } = useLoad("/dashboard");
  if (!data && !error) return <Loading />;
  const k = data?.kpis ?? {};
  return (
    <>
      <PageHeader
        eyebrow="FIRM OVERVIEW"
        title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${user?.name?.split(" ")[0] ?? "Counsel"}.`}
        description="Here’s what’s happening across your practice today."
        action={
          <button
            className="secondary-button"
            onClick={() => location.assign("/analytics")}
          >
            <CalendarClock size={16} /> Last 30 days <ChevronDown size={15} />
          </button>
        }
      />
      <ErrorNotice error={error} />
      <div className="welcome-strip">
        <div className="welcome-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <b>Your practice, at a glance</b>
          <span>Stay ahead of every matter and upcoming milestone.</span>
        </div>
        <span className="today-label">{dateText(new Date())}</span>
      </div>
      <div className="stats-grid">
        <StatCard
          label="Total cases"
          value={k.totalCases}
          note={`${k.activeCases ?? 0} currently active`}
          Icon={BriefcaseBusiness}
        />
        <StatCard
          label="Open tasks"
          value={k.pendingTasks}
          note={`${k.overdueTasks ?? 0} past due`}
          Icon={Check}
          tone="green"
        />
        <StatCard
          label="Deadlines · 7 days"
          value={k.upcomingDeadlines}
          note="Across open matters"
          Icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="High risk"
          value={k.highRiskDeadlines}
          note="Requires your attention"
          Icon={ShieldCheck}
          tone="rose"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">PORTFOLIO</span>
              <h3>Cases by status</h3>
            </div>
            <Link to="/cases" className="link-button">
              All cases <ArrowRight size={14} />
            </Link>
          </div>
          {data?.casesByStatus?.some((item) => item.value) ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.casesByStatus.filter((x) => x.value)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {data.casesByStatus
                      .filter((x) => x.value)
                      .map((_, index) => (
                        <Cell
                          key={index}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {data.casesByStatus
                  .filter((item) => item.value)
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={item.name}>
                      <i style={{ background: colors[index] }} />
                      <span>{item.name}</span>
                      <b>{item.value}</b>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <Empty
              title="No case activity yet"
              detail="Seed demo data to populate the dashboard."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">NEEDS ATTENTION</span>
              <h3>Upcoming deadlines</h3>
            </div>
            <Link to="/tasks" className="link-button">
              View tasks <ArrowRight size={14} />
            </Link>
          </div>
          <div className="deadline-list">
            {(data?.upcoming ?? []).slice(0, 5).map((item) => (
              <div className="deadline-row" key={item._id}>
                <div className="deadline-date">
                  <b>
                    {new Date(item.dueDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      timeZone: "Asia/Kolkata",
                    })}
                  </b>
                  <span>
                    {new Date(item.dueDate).toLocaleDateString("en-IN", {
                      month: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
                <div className="deadline-info">
                  <b>{item.title}</b>
                  <span>
                    {item.case?.title ?? "Matter"} ·{" "}
                    {item.assignedTo?.name ?? "Unassigned"}
                  </span>
                </div>
                <span className={statusClass(item.risk?.category)}>
                  {item.risk?.category?.replace(" RISK", "") ?? "PENDING"}
                </span>
              </div>
            ))}
            {!data?.upcoming?.length && (
              <Empty
                title="No upcoming deadlines"
                detail="Due dates will show up here."
              />
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">MATTER MIX</span>
              <h3>Case types</h3>
            </div>
          </div>
          <div className="compact-chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={data?.casesByType ?? []}
                margin={{ left: -20, right: 4 }}
              >
                <CartesianGrid vertical={false} stroke="#edf0f4" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#6b86ac"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel insight-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">PRACTICE PULSE</span>
              <h3>On top of the details</h3>
            </div>
            <div className="pulse-orb">
              <Activity size={17} />
            </div>
          </div>
          <div className="progress-info">
            <span>Task completion</span>
            <b>{data?.taskCompletion ?? 0}%</b>
          </div>
          <div className="progress-track">
            <span style={{ width: `${data?.taskCompletion ?? 0}%` }} />
          </div>
          <div className="insight-bottom">
            <div>
              <span>Clients</span>
              <b>{k.totalClients ?? 0}</b>
            </div>
            <div>
              <span>Lawyers</span>
              <b>{k.totalLawyers ?? 0}</b>
            </div>
            <div>
              <span>Closed matters</span>
              <b>{k.closedCases ?? 0}</b>
            </div>
          </div>
          <Link to="/analytics" className="insight-link">
            Explore firm analytics <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <div className="demo-disclaimer">
        <ShieldCheck size={15} /> Deadline risk estimates are demonstrations
        trained on synthetic data — not legal advice or real-world outcome
        probabilities.
      </div>
    </>
  );
}

function DataTable({ columns, rows, empty, loading }) {
  if (loading) return <Loading />;
  if (!rows?.length) return <Empty {...empty} />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map(([label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row._id ?? row.id ?? i}>
              {columns.map(([, render], c) => (
                <td key={c}>{render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal">
        <header>
          <div>
            <span className="panel-kicker">WORKSPACE</span>
            <h3>{title}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function PortalPage({ title }) {
  const location = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const path = location.pathname.split("/")[1];
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [caseTab, setCaseTab] = useState("Overview");
  const [editing, setEditing] = useState(false);
  const [caseStatus, setCaseStatus] = useState("");
  const [casePage, setCasePage] = useState(1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    client: "",
    case: "",
    assignedTo: "",
    dueDate: "",
    priority: "Medium",
    status: "Active",
    type: "Civil",
    message: "",
  });
  const routes = {
    "/cases": "/cases",
    "/tasks": "/tasks",
    "/calendar": "/calendar",
    "/risk": "/risk",
    "/clients": "/clients",
    "/communications": "/communications",
    "/documents": "/documents",
    "/analytics": "/dashboard",
    "/notifications": "/notifications",
    "/users": "/users",
    "/audit": "/audit",
    "/settings": "/dashboard",
    "/profile": "/auth/me",
  };
  const listUrl =
    path === "cases" && !id
      ? `/cases?page=${casePage}&limit=25${caseStatus ? `&status=${encodeURIComponent(caseStatus)}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`
      : null;
  const { data, error } = useLoad(
    path === "cases" && id
      ? `/cases/${id}`
      : path === "tasks" && id
        ? `/tasks/${id}`
        : (listUrl ??
          routes[location.pathname] ??
          routes[`/${path}`] ??
          "/dashboard"),
    refresh,
  );
  const { data: cases } = useLoad("/cases");
  const { data: clients } = useLoad("/clients");
  const { data: users } = useLoad(user?.role === "admin" ? "/users" : "/team");
  const rows = useMemo(
    () =>
      Array.isArray(data)
        ? data.filter((item) =>
            JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
          )
        : [],
    [data, search],
  );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (path === "cases") {
        const payload = { ...form };
        if (!payload.lawyer) delete payload.lawyer;
        await api.post("/cases", payload);
      } else if (path === "tasks") {
        await api.post("/tasks", form);
      } else if (path === "communications") {
        await api.post("/communications", {
          case: form.case,
          message: form.message,
          internal: user?.role !== "client",
        });
      } else if (path === "documents") {
        const file = e.target.elements.file.files[0];
        const body = new FormData();
        body.append("file", file);
        body.append("case", form.case);
        await api.post("/documents", body);
      } else if (path === "users") {
        await api.post("/users", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      setModal(false);
      setRefresh((value) => value + 1);
      setMessage("Saved successfully.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function markRead(item) {
    try {
      if (item.readAt) return;
      await api.patch(`/notifications/${item._id}/read`);
      setRefresh((value) => value + 1);
    } catch (err) {
      setMessage(err.message);
    }
  }
  async function markAll() {
    try {
      await api.patch("/notifications/read-all");
      setRefresh((value) => value + 1);
    } catch (err) {
      setMessage(err.message);
    }
  }
  async function openNotification(item) {
    try {
      if (!item.readAt) await api.patch(`/notifications/${item._id}/read`);
      if (item.link) navigate(item.link);
      else setRefresh((value) => value + 1);
    } catch (err) {
      setMessage(err.message);
    }
  }
  const canCreate = ["admin", "lawyer"].includes(user?.role);
  const createLabel =
    path === "cases"
      ? "New case"
      : path === "tasks"
        ? "New task"
        : path === "communications"
          ? "Record communication"
          : path === "documents"
            ? "Upload document"
            : path === "users"
              ? "Add user"
              : "";
  const actionAllowed = ["cases", "tasks"].includes(path)
    ? canCreate
    : path === "users"
      ? user?.role === "admin"
      : path === "documents"
        ? user?.role !== "client"
        : Boolean(createLabel);
  const action =
    createLabel && actionAllowed ? (
      <button className="primary-button" onClick={() => setModal(true)}>
        <Plus size={16} />
        {createLabel}
      </button>
    ) : null;

  if (path === "cases" && id) {
    async function updateCase(event) {
      event.preventDefault();
      try {
        await api.patch(`/cases/${id}`, {
          title: event.target.title.value,
          description: event.target.description.value,
          status: event.target.status.value,
        });
        setEditing(false);
        setRefresh((value) => value + 1);
        setMessage("Matter updated successfully.");
      } catch (err) {
        setMessage(err.message);
      }
    }
    if (path === "tasks" && id) {
      return (
        <>
          <PageHeader
            eyebrow="TASK DETAILS"
            title={title}
            description="Status, due date and modelled deadline risk for this task."
            action={
              <button
                className="secondary-button"
                onClick={() => navigate("/tasks")}
              >
                ← Back to tasks
              </button>
            }
          />
          <ErrorNotice error={error} />
          {data ? (
            <div className="panel case-detail">
              <div className="case-title-row">
                <div>
                  <h2>{data.title}</h2>
                  <div className="case-meta">
                    <Link
                      to={`/cases/${data.case?._id}`}
                      className="table-link"
                    >
                      {data.case?.title}
                    </Link>
                    <span className={statusClass(data.status)}>
                      {data.status}
                    </span>
                    <span
                      className={`priority priority-${data.priority?.toLowerCase()}`}
                    >
                      {data.priority} priority
                    </span>
                  </div>
                </div>
                {user?.role !== "client" && (
                  <select
                    className="inline-select"
                    value={data.status}
                    onChange={async (e) => {
                      try {
                        await api.patch(`/tasks/${id}`, {
                          status: e.target.value,
                        });
                        setRefresh((v) => v + 1);
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                  >
                    {[
                      "Not Started",
                      "In Progress",
                      "Under Review",
                      "Completed",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                )}
              </div>
              {message && <div className="alert error">{message}</div>}
              <div className="detail-grid">
                <div>
                  <span>Assigned to</span>
                  <b>{data.assignedTo?.name}</b>
                </div>
                <div>
                  <span>Created by</span>
                  <b>{data.createdBy?.name}</b>
                </div>
                <div>
                  <span>Due date</span>
                  <b>{dateText(data.dueDate)}</b>
                </div>
                <div>
                  <span>Related matter</span>
                  <b>{data.case?.caseId}</b>
                </div>
              </div>
              <p>{data.description || "No task description provided."}</p>
              <div className="risk-disclosure">
                <ShieldCheck size={16} />
                <span>
                  <b>
                    {data.risk?.category || "RISK NOT SCORED"} ·{" "}
                    {Math.round((data.risk?.probability || 0) * 100)}%
                  </b>
                  <br />
                  {data.risk?.source ||
                    "Risk calculated when the deadline list is refreshed."}{" "}
                  — Synthetic decision-support estimate only.
                </span>
              </div>
              <div className="risk-factors">
                {(data.risk?.factors || []).map((factor) => (
                  <span key={factor}>· {factor}</span>
                ))}
              </div>
              <div className="recommendation">
                <Sparkles size={15} />
                {data.risk?.recommendation || "Continue regular monitoring."}
              </div>
            </div>
          ) : (
            <Loading />
          )}
        </>
      );
    }
    async function deleteCase() {
      if (
        !window.confirm(
          "Delete this case, its tasks, communications and documents? This cannot be undone.",
        )
      )
        return;
      try {
        await api.delete(`/cases/${id}`);
        navigate("/cases");
      } catch (err) {
        setMessage(err.message);
      }
    }
    const tabs = [
      "Overview",
      "Tasks",
      "Deadlines",
      "Documents",
      "Client communication",
      "Activity history",
    ];
    return (
      <>
        <PageHeader
          eyebrow="MATTER DETAILS"
          title={title}
          description="Overview, tasks and client history for this matter."
          action={
            <button
              className="secondary-button"
              onClick={() => navigate("/cases")}
            >
              ← Back to cases
            </button>
          }
        />
        <ErrorNotice error={error} />
        {message && <div className="alert success">{message}</div>}
        {data?.case ? (
          <div className="panel case-detail">
            <div className="case-title-row">
              <div>
                <h2>{data.case.title}</h2>
                <div className="case-meta">
                  <span>{data.case.caseId}</span>
                  <span>{data.case.type}</span>
                  <span className={statusClass(data.case.status)}>
                    {data.case.status}
                  </span>
                  <span>{data.case.priority} priority</span>
                </div>
              </div>
              {["admin", "lawyer"].includes(user?.role) && (
                <div className="case-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setEditing(!editing)}
                  >
                    Edit matter
                  </button>
                  {user?.role === "admin" && (
                    <button className="danger-button" onClick={deleteCase}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            {editing && (
              <form className="case-edit-form" onSubmit={updateCase}>
                <label>
                  Title
                  <input
                    name="title"
                    defaultValue={data.case.title}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={data.case.status}>
                    {[
                      "New",
                      "Active",
                      "Pending",
                      "Under Review",
                      "Hearing Scheduled",
                      "Completed",
                      "Closed",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={data.case.description}
                  />
                </label>
                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button className="primary-button">Save matter</button>
                </div>
              </form>
            )}
            <div className="detail-grid">
              <div>
                <span>Client</span>
                <b>{data.case.client?.name}</b>
              </div>
              <div>
                <span>Assigned lawyer</span>
                <b>{data.case.lawyer?.name || "Unassigned"}</b>
              </div>
              <div>
                <span>Court</span>
                <b>{data.case.courtName || "—"}</b>
              </div>
              <div>
                <span>Next hearing</span>
                <b>{dateText(data.case.nextHearingDate)}</b>
              </div>
            </div>
            <div className="case-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCaseTab(tab)}
                  className={caseTab === tab ? "selected" : ""}
                >
                  {tab}
                </button>
              ))}
            </div>
            {caseTab === "Overview" && (
              <>
                <p>{data.case.description || "No description provided."}</p>
                <div className="case-overview-note">
                  <span>Case deadline</span>
                  <b>{dateText(data.case.deadline)}</b>
                  <span>Filed</span>
                  <b>{dateText(data.case.filingDate)}</b>
                  <span>Opposing party</span>
                  <b>{data.case.opposingParty || "—"}</b>
                </div>
              </>
            )}
            {caseTab === "Tasks" && (
              <DataTable
                columns={[
                  ["Task", (r) => r.title],
                  ["Assigned", (r) => r.assignedTo?.name],
                  ["Due", (r) => dateText(r.dueDate)],
                  [
                    "Status",
                    (r) => (
                      <span className={statusClass(r.status)}>{r.status}</span>
                    ),
                  ],
                ]}
                rows={data.tasks}
              />
            )}
            {caseTab === "Deadlines" && (
              <DataTable
                columns={[
                  ["Deadline", (r) => dateText(r.dueDate)],
                  ["Task", (r) => r.title],
                  [
                    "Status",
                    (r) => (
                      <span className={statusClass(r.status)}>{r.status}</span>
                    ),
                  ],
                ]}
                rows={[
                  ...(data.tasks || []),
                  ...(data.case.deadline
                    ? [
                        {
                          _id: "case-deadline",
                          title: "Case deadline",
                          dueDate: data.case.deadline,
                          status: data.case.status,
                        },
                      ]
                    : []),
                ]}
              />
            )}
            {caseTab === "Documents" && (
              <DataTable
                columns={[
                  ["Document", (r) => r.originalName],
                  ["Category", (r) => r.category],
                  ["Uploaded", (r) => dateText(r.createdAt)],
                  ["By", (r) => r.uploadedBy?.name],
                ]}
                rows={data.documents}
              />
            )}
            {caseTab === "Client communication" && (
              <DataTable
                columns={[
                  ["Date", (r) => dateText(r.createdAt)],
                  ["Sender", (r) => r.sender?.name],
                  ["Message", (r) => r.message],
                  ["Type", (r) => r.type],
                ]}
                rows={data.communications}
              />
            )}
            {caseTab === "Activity history" && (
              <div className="empty-state">
                <div>
                  <Activity size={20} />
                </div>
                <b>Activity history</b>
                <span>
                  Audit event details are available to firm administrators.
                </span>
              </div>
            )}
          </div>
        ) : (
          <Loading />
        )}
      </>
    );
  }

  let description = "Manage the details that keep your practice moving.";
  if (path === "risk")
    description =
      "Model-based estimates help the team focus attention on deadlines that may need support.";
  if (path === "communications")
    description =
      "A shared, permission-aware history of client conversations and follow-ups.";
  if (path === "calendar")
    description =
      "Hearings, task due dates and matter deadlines in Asia/Kolkata time.";
  if (path === "analytics")
    description =
      "Practice-wide measures calculated from your current matter records.";
  const subtitle =
    path === "risk"
      ? "SYNTHETIC MODEL · DECISION SUPPORT ONLY"
      : path === "calendar"
        ? "PRACTICE CALENDAR"
        : "PRACTICE MANAGEMENT";
  return (
    <>
      <PageHeader
        eyebrow={subtitle}
        title={title}
        description={description}
        action={action}
      />
      {message && (
        <div
          className={`alert ${message.includes("success") ? "success" : "error"}`}
        >
          {message}
        </div>
      )}
      <ErrorNotice error={error} />
      {path === "cases" && (
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search matters…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCasePage(1);
              }}
            />
          </div>
          <select
            className="inline-select"
            value={caseStatus}
            onChange={(e) => {
              setCaseStatus(e.target.value);
              setCasePage(1);
            }}
          >
            <option value="">All statuses</option>
            {[
              "New",
              "Active",
              "Pending",
              "Under Review",
              "Hearing Scheduled",
              "Completed",
              "Closed",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <span className="record-count">{data?.total ?? 0} matters</span>
        </div>
      )}
      {path === "cases" && (
        <div className="panel">
          <DataTable
            loading={!data}
            empty={{
              title: "No matters found",
              detail: "Create a matter or adjust your search.",
            }}
            columns={[
              [
                "Matter",
                (r) => (
                  <Link className="table-link" to={`/cases/${r._id}`}>
                    <b>{r.title}</b>
                    <small>{r.caseId || r.caseNumber || "Matter"}</small>
                  </Link>
                ),
              ],
              ["Client", (r) => r.client?.name],
              ["Type", (r) => r.type],
              ["Lead counsel", (r) => r.lawyer?.name || "—"],
              ["Next date", (r) => dateText(r.nextHearingDate || r.deadline)],
              [
                "Status",
                (r) => (
                  <span className={statusClass(r.status)}>{r.status}</span>
                ),
              ],
              [
                "Priority",
                (r) => (
                  <span
                    className={`priority priority-${String(r.priority).toLowerCase()}`}
                  >
                    {r.priority}
                  </span>
                ),
              ],
            ]}
            rows={data?.items}
          />
          <div className="pagination">
            <button
              className="secondary-button"
              disabled={casePage <= 1}
              onClick={() => setCasePage((page) => page - 1)}
            >
              Previous
            </button>
            <span>
              Page {data?.page ?? 1} of {Math.max(data?.pages ?? 1, 1)}
            </span>
            <button
              className="secondary-button"
              disabled={casePage >= (data?.pages ?? 1)}
              onClick={() => setCasePage((page) => page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {path === "tasks" && (
        <div className="panel">
          <DataTable
            loading={!data}
            empty={{
              title: "No tasks assigned",
              detail: "Create your first task to track progress and due dates.",
            }}
            columns={[
              [
                "Task",
                (r) => (
                  <div className="cell-primary">
                    <Link className="table-link" to={`/tasks/${r._id}`}>
                      <b>{r.title}</b>
                    </Link>
                    <small>{r.case?.title}</small>
                  </div>
                ),
              ],
              ["Assignee", (r) => r.assignedTo?.name],
              ["Due date", (r) => dateText(r.dueDate)],
              [
                "Priority",
                (r) => (
                  <span
                    className={`priority priority-${r.priority?.toLowerCase()}`}
                  >
                    {r.priority}
                  </span>
                ),
              ],
              [
                "Risk",
                (r) => (
                  <span className={statusClass(r.risk?.category)}>
                    {r.risk?.category ?? "Not scored"}
                  </span>
                ),
              ],
              [
                "Status",
                (r) =>
                  user?.role === "client" ? (
                    r.status
                  ) : (
                    <select
                      className="inline-select"
                      value={r.status}
                      onChange={async (e) => {
                        try {
                          await api.patch(`/tasks/${r._id}`, {
                            status: e.target.value,
                          });
                          setRefresh((v) => v + 1);
                        } catch (err) {
                          setMessage(err.message);
                        }
                      }}
                    >
                      {[
                        "Not Started",
                        "In Progress",
                        "Under Review",
                        "Completed",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  ),
              ],
              [
                "",
                (r) =>
                  ["admin", "lawyer"].includes(user?.role) ? (
                    <button
                      className="danger-button"
                      onClick={async () => {
                        if (!window.confirm("Delete this task?")) return;
                        try {
                          await api.delete(`/tasks/${r._id}`);
                          setRefresh((v) => v + 1);
                        } catch (err) {
                          setMessage(err.message);
                        }
                      }}
                    >
                      Delete
                    </button>
                  ) : null,
              ],
            ]}
            rows={rows}
          />
        </div>
      )}
      {path === "risk" && (
        <div className="risk-disclosure">
          <ShieldCheck size={17} />
          <span>
            <b>Demonstration model.</b> Predictions are trained using synthetic
            data and are not validated legal advice, guaranteed forecasts or
            real-world outcome probabilities.
          </span>
          <span className="demo-badge">LOCAL FALLBACK AVAILABLE</span>
        </div>
      )}
      {path === "risk" && (
        <div className="risk-grid">
          {data?.map(({ task, risk }) => (
            <article className="risk-card" key={task._id}>
              <div className="risk-card-top">
                <div>
                  <span className="panel-kicker">
                    {task.case?.caseId ?? "MATTER"}
                  </span>
                  <h3>{task.title}</h3>
                  <span>
                    {task.case?.title} · {task.assignedTo?.name}
                  </span>
                </div>
                <div
                  className={`risk-score ${risk.category === "HIGH RISK" ? "high" : risk.category === "MEDIUM RISK" ? "medium" : "low"}`}
                >
                  {Math.round(risk.probability * 100)}
                  <small>%</small>
                </div>
              </div>
              <div className="risk-line">
                <span className={statusClass(risk.category)}>
                  {risk.category}
                </span>
                <span>
                  Due {dateText(task.dueDate)} ·{" "}
                  {risk.daysRemaining < 0
                    ? `${Math.abs(risk.daysRemaining)} days overdue`
                    : `${risk.daysRemaining} days remaining`}
                </span>
              </div>
              <div className="risk-factors">
                <b>Contributing factors · {risk.source}</b>
                {risk.factors.map((factor) => (
                  <span key={factor}>· {factor}</span>
                ))}
              </div>
              <div className="recommendation">
                <Sparkles size={15} />
                {risk.recommendation}
              </div>
            </article>
          ))}
          {!data?.length && (
            <div className="panel">
              <Empty
                title="No open deadlines"
                detail="Active task deadlines and risk estimates will appear here."
              />
            </div>
          )}
        </div>
      )}
      {path === "calendar" && <CalendarPanel events={data} />}
      {path === "clients" && (
        <div className="panel">
          <div className="toolbar">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Search clients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <DataTable
            loading={!data}
            empty={{ title: "No clients found" }}
            columns={[
              ["Client", (r) => <b>{r.name}</b>],
              ["Email", (r) => r.email],
              ["Client since", (r) => dateText(r.createdAt)],
            ]}
            rows={rows}
          />
        </div>
      )}
      {path === "communications" && (
        <div className="panel">
          <DataTable
            loading={!data}
            empty={{
              title: "No communications yet",
              detail: "Client conversations will be recorded here.",
            }}
            columns={[
              ["Date", (r) => dateText(r.createdAt)],
              ["Client", (r) => r.client?.name],
              ["Matter", (r) => r.case?.title],
              ["From", (r) => r.sender?.name],
              [
                "Message",
                (r) => <span className="message-cell">{r.message}</span>,
              ],
              ["Type", (r) => r.type],
            ]}
            rows={rows}
          />
        </div>
      )}
      {path === "documents" && (
        <div className="panel">
          <DataTable
            loading={!data}
            empty={{
              title: "No documents uploaded",
              detail:
                "Upload matter documents in PDF, DOC, DOCX, JPG or PNG format.",
            }}
            columns={[
              [
                "Document",
                (r) => (
                  <div className="cell-primary">
                    <b>{r.originalName}</b>
                    <small>
                      {(r.size / 1024).toFixed(0)} KB · {r.category}
                    </small>
                  </div>
                ),
              ],
              ["Matter", (r) => r.case?.title],
              ["Uploaded by", (r) => r.uploadedBy?.name],
              ["Added", (r) => dateText(r.createdAt)],
              [
                "",
                (r) => (
                  <a
                    className="icon-button"
                    href={`${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/documents/${r._id}/download`}
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const result = await api.get(
                          `/documents/${r._id}/download`,
                          { responseType: "blob" },
                        );
                        const url = URL.createObjectURL(result);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = r.originalName;
                        link.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                  >
                    <ArrowDownToLine size={17} />
                  </a>
                ),
              ],
            ]}
            rows={rows}
          />
        </div>
      )}
      {path === "analytics" && <AnalyticsPanel />}
      {path === "notifications" && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">YOUR INBOX</span>
              <h3>Recent notifications</h3>
            </div>
            <button className="text-button" onClick={markAll}>
              Mark all as read
            </button>
          </div>
          {data?.map((item) => (
            <button
              key={item._id}
              className={`notification-row ${item.readAt ? "" : "unread"}`}
              onClick={() => openNotification(item)}
            >
              <span className="notification-mark">
                <Activity size={16} />
              </span>
              <span className="notification-copy">
                <b>{item.title}</b>
                <span>{item.message}</span>
                <small>
                  {dateText(item.createdAt)} · {item.category}
                </small>
              </span>
              {!item.readAt && <i className="unread-dot" />}
            </button>
          ))}
          {!data?.length && (
            <Empty
              title="You’re all caught up"
              detail="New assignments and deadline alerts will appear here."
            />
          )}
        </div>
      )}
      {path === "users" && (
        <div className="panel">
          <DataTable
            loading={!data}
            empty={{ title: "No team members" }}
            columns={[
              ["Name", (r) => <b>{r.name}</b>],
              ["Email", (r) => r.email],
              [
                "Role",
                (r) => (
                  <select
                    className="inline-select"
                    value={r.role}
                    onChange={async (e) => {
                      try {
                        await api.patch(`/users/${r._id}`, {
                          role: e.target.value,
                        });
                        setRefresh((v) => v + 1);
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                  >
                    {["admin", "lawyer", "staff", "client"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                ),
              ],
              [
                "Access",
                (r) => (
                  <button
                    className={`status ${r.active ? "status-active" : "status-overdue"}`}
                    onClick={async () => {
                      try {
                        await api.patch(`/users/${r._id}`, {
                          active: !r.active,
                        });
                        setRefresh((v) => v + 1);
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                  >
                    {r.active ? "Active" : "Inactive"}
                  </button>
                ),
              ],
              ["Joined", (r) => dateText(r.createdAt)],
            ]}
            rows={data}
          />
        </div>
      )}
      {path === "audit" && (
        <div className="panel">
          <DataTable
            loading={!data}
            empty={{ title: "No audit activity" }}
            columns={[
              ["Time", (r) => dateText(r.createdAt)],
              ["User", (r) => r.actor?.name],
              ["Action", (r) => <code>{r.action}</code>],
              ["Record", (r) => r.entity],
              ["Details", (r) => r.detail],
            ]}
            rows={data}
          />
        </div>
      )}
      {path === "profile" && (
        <div className="panel profile-panel">
          <div className="avatar large">
            {user?.name
              ?.split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <span className="panel-kicker">YOUR ACCOUNT</span>
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
            <span className="status status-active">{user?.role}</span>
          </div>
        </div>
      )}
      {path === "settings" && (
        <div className="panel settings-panel">
          <div className="settings-title">
            <ShieldCheck size={20} />
            <div>
              <h3>Privacy & model settings</h3>
              <p>
                Configuration and transparency for this demonstration workspace.
              </p>
            </div>
          </div>
          <div className="settings-item">
            <div>
              <b>Risk prediction threshold</b>
              <span>Low below 30% · Medium below 65% · High otherwise</span>
            </div>
            <span className="settings-tag">DEFAULT</span>
          </div>
          <div className="settings-item">
            <div>
              <b>Time zone</b>
              <span>Asia/Kolkata (IST)</span>
            </div>
            <span className="settings-tag">LOCAL</span>
          </div>
          <div className="settings-item">
            <div>
              <b>Email notifications</b>
              <span>
                In-app notification center is always available. SMTP requires
                server-side configuration.
              </span>
            </div>
            <span className="settings-tag">CONFIGURABLE</span>
          </div>
          <div className="settings-item">
            <div>
              <b>Calendar integration</b>
              <span>
                Internal hearing and task calendar active. Google Calendar OAuth
                is not configured.
              </span>
            </div>
            <span className="settings-tag">INTERNAL</span>
          </div>
        </div>
      )}
      {modal && (
        <Modal title={createLabel} onClose={() => setModal(false)}>
          <form className="modal-form" onSubmit={submit}>
            {(path === "cases" || path === "tasks") && (
              <>
                <label>
                  Title
                  <input
                    required
                    minLength={2}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Related client / case
                  <select
                    required
                    value={path === "cases" ? form.client : form.case}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [path === "cases" ? "client" : "case"]: e.target.value,
                      })
                    }
                  >
                    <option value="">Select…</option>
                    {path === "cases"
                      ? (clients || []).map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name}
                          </option>
                        ))
                      : (cases?.items || cases || []).map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.title}
                          </option>
                        ))}
                  </select>
                </label>
                {path === "cases" && (
                  <>
                    <label>
                      Case type
                      <select
                        value={form.type}
                        onChange={(e) =>
                          setForm({ ...form, type: e.target.value })
                        }
                      >
                        {[
                          "Civil",
                          "Criminal",
                          "Family",
                          "Property",
                          "Corporate",
                          "Labour",
                          "Consumer",
                          "Other",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assigned lawyer
                      <select
                        value={form.lawyer}
                        onChange={(e) =>
                          setForm({ ...form, lawyer: e.target.value })
                        }
                      >
                        <option value="">Unassigned</option>
                        {(users || [])
                          .filter((u) => u.role === "lawyer")
                          .map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Case description
                      <textarea
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                {path === "tasks" && (
                  <>
                    <label>
                      Assigned user
                      <select
                        required
                        value={form.assignedTo}
                        onChange={(e) =>
                          setForm({ ...form, assignedTo: e.target.value })
                        }
                      >
                        <option value="">Select…</option>
                        {(users || [])
                          .filter((u) => ["lawyer", "staff"].includes(u.role))
                          .map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Due date
                      <input
                        required
                        type="date"
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm({ ...form, dueDate: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Priority
                      <select
                        value={form.priority}
                        onChange={(e) =>
                          setForm({ ...form, priority: e.target.value })
                        }
                      >
                        {["Low", "Medium", "High", "Critical"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Description
                      <textarea
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
              </>
            )}
            {path === "communications" && (
              <>
                <label>
                  Related matter
                  <select
                    required
                    value={form.case}
                    onChange={(e) => setForm({ ...form, case: e.target.value })}
                  >
                    <option value="">Select matter…</option>
                    {(cases?.items || cases || []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Message
                  <textarea
                    required
                    maxLength={5000}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            {path === "documents" && (
              <>
                <label>
                  Related matter
                  <select
                    required
                    value={form.case}
                    onChange={(e) => setForm({ ...form, case: e.target.value })}
                  >
                    <option value="">Select matter…</option>
                    {(cases?.items || cases || []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Document
                  <input
                    name="file"
                    required
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
                <small>PDF, DOC, DOCX, JPG or PNG. Maximum 10 MB.</small>
              </>
            )}
            {path === "users" && (
              <>
                <label>
                  Full name
                  <input
                    required
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={form.email || ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Temporary password
                  <input
                    required
                    minLength={10}
                    type="password"
                    value={form.password || ""}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </label>
                <label>
                  Role
                  <select
                    value={form.role || "staff"}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {["admin", "lawyer", "staff", "client"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function AnalyticsPanel() {
  const { data, error } = useLoad("/dashboard");
  if (!data && !error) return <Loading />;
  return (
    <>
      <ErrorNotice error={error} />
      <div className="stats-grid analytics-stats">
        <StatCard
          label="Total cases"
          value={money(data?.kpis.totalCases)}
          note={`${data?.kpis.activeCases} active`}
          Icon={BriefcaseBusiness}
        />
        <StatCard
          label="Total clients"
          value={money(data?.kpis.totalClients)}
          note="Across accessible matters"
          Icon={Users}
          tone="green"
        />
        <StatCard
          label="Overdue tasks"
          value={money(data?.kpis.overdueTasks)}
          note="Requires follow-up"
          Icon={Clock3}
          tone="rose"
        />
        <StatCard
          label="High-risk deadlines"
          value={money(data?.kpis.highRiskDeadlines)}
          note="Model estimates"
          Icon={ShieldCheck}
          tone="amber"
        />
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">CASE DISTRIBUTION</span>
              <h3>Matters by type</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.casesByType || []}>
              <CartesianGrid vertical={false} stroke="#edf0f4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6482aa" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">DEADLINE FORECAST</span>
              <h3>Risk distribution</h3>
            </div>
          </div>
          {data?.riskDistribution?.some((x) => x.value) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {data.riskDistribution.map((_, i) => (
                    <Cell fill={["#80a694", "#d4b370", "#cc7b72"][i]} key={i} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty
              title="No risk scores yet"
              detail="Open tasks will populate this chart as they are scored."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">TEAM CAPACITY</span>
              <h3>Open tasks by assignee</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data?.lawyerWorkload || []}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <CartesianGrid horizontal={false} stroke="#edf0f4" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 10 }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#8e82ad" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel completion-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">OPERATIONS</span>
              <h3>Task completion</h3>
            </div>
          </div>
          <div className="completion-value">
            {data?.taskCompletion ?? 0}
            <small>%</small>
          </div>
          <div className="progress-track">
            <span style={{ width: `${data?.taskCompletion ?? 0}%` }} />
          </div>
          <p>Share of tracked tasks marked complete.</p>
        </section>
      </div>
      <div className="demo-disclaimer">
        <ShieldCheck size={15} /> Analytics reflect actual database records
        within your access scope. Historical creation trend is not available
        until enough data accumulates.
      </div>
    </>
  );
}

function CalendarPanel({ events }) {
  const [view, setView] = useState("month");
  const [anchor, setAnchor] = useState(() => new Date());
  if (!events) return <Loading />;
  const formatKey = (date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  const currentKey = formatKey(anchor);
  const [yearText, monthText] = currentKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const start = new Date(firstDay);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const dayCount =
    Math.ceil(
      (lastDay.getTime() - start.getTime() + firstDay.getUTCDay() * 86400000) /
        86400000 /
        7,
    ) * 7;
  const days = Array.from({ length: Math.max(35, dayCount) }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = formatKey(date);
    return {
      date,
      key,
      events: events.filter((event) => formatKey(new Date(event.date)) === key),
    };
  });
  const weekStart = new Date(
    Date.UTC(year, month, Number(currentKey.slice(-2))),
  );
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const visibleDays =
    view === "day"
      ? days.filter((day) => day.key === currentKey)
      : view === "week"
        ? days.filter(
            (day) =>
              day.date >= weekStart &&
              day.date < new Date(weekStart.getTime() + 7 * 86400000),
          )
        : days;
  function move(amount) {
    const next = new Date(anchor);
    if (view === "month") next.setMonth(next.getMonth() - amount);
    else next.setDate(next.getDate() - (view === "week" ? 7 : 1) * amount);
    setAnchor(next);
  }
  const heading =
    view === "day"
      ? dateText(anchor)
      : new Intl.DateTimeFormat("en", {
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(anchor);
  return (
    <section className="panel calendar-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">PRACTICE CALENDAR</span>
          <h3>Hearings & due dates</h3>
        </div>
        <span className="timezone-tag">Asia/Kolkata · IST</span>
      </div>
      <div className="calendar-toolbar">
        <div className="calendar-mode">
          {["month", "week", "day"].map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="calendar-controls">
          <button
            className="secondary-button"
            onClick={() => setAnchor(new Date())}
          >
            Today
          </button>
          <button
            className="calendar-arrow"
            onClick={() => move(1)}
            aria-label="Previous period"
          >
            ‹
          </button>
          <b>{heading}</b>
          <button
            className="calendar-arrow"
            onClick={() => move(-1)}
            aria-label="Next period"
          >
            ›
          </button>
        </div>
      </div>
      {view === "month" && (
        <div className="calendar-grid calendar-weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      )}
      <div
        className={`calendar-grid ${view !== "month" ? "calendar-agenda" : ""}`}
      >
        {visibleDays.map((day) => (
          <div
            key={day.key}
            className={`calendar-day ${day.key === currentKey ? "today" : ""} ${Number(day.key.slice(-2)) === 1 ? "month-start" : ""}`}
          >
            <div className="calendar-date">
              <b>{day.date.getUTCDate()}</b>
              {view !== "month" && (
                <span>
                  {new Intl.DateTimeFormat("en", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    timeZone: "Asia/Kolkata",
                  }).format(day.date)}
                </span>
              )}
            </div>
            <div className="calendar-events">
              {day.events.map((event) => (
                <div
                  key={event.id}
                  className={`calendar-event event-${event.type}`}
                  title={event.title}
                >
                  <i />
                  {event.title}             
                </div>
              ))}
              {view !== "month" && !day.events.length && (
                <span className="no-events">No scheduled events</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {!events.length && (
        <div className="calendar-empty">
          No dates scheduled yet. Add a task due date or hearing to see it here.
        </div>
      )}
    </section>
  );
}
