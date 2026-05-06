import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const client = axios.create({ baseURL: API_URL });

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.message || error.response?.data?.detail || error.message;
    throw new Error(msg);
  }
);

function normalizeDetail(data) {
  if (!data) return null;
  return {
    judgment_id: data.judgment_id || "",
    document_info: {
      filename:      data.document_info?.filename      || data.filename      || "Unknown",
      storage_url:   data.document_info?.storage_url   || data.storage_url   || "",
      total_pages:   data.document_info?.total_pages   || data.total_pages   || 0,
      digital_pages: data.document_info?.digital_pages || data.digital_pages || 0,
      ocr_pages:     data.document_info?.ocr_pages     || data.ocr_pages     || 0,
      uploaded_at:   data.document_info?.uploaded_at   || data.created_at    || ""
    },
    case_details: {
      case_number:        data.case_details?.case_number        || data.case_number        || "N/A",
      court_name:         data.case_details?.court_name         || data.court_name         || "N/A",
      bench:              data.case_details?.bench              || data.bench              || "",
      date_of_order:      data.case_details?.date_of_order      || data.date_of_order      || "N/A",
      petitioner:         data.case_details?.petitioner         || data.petitioner         || "N/A",
      respondent:         data.case_details?.respondent         || data.respondent         || "N/A",
      subject_matter:     data.case_details?.subject_matter     || data.subject_matter     || "N/A",
      department:         data.case_details?.department         || data.department_hint    || "N/A",
      overall_confidence: data.case_details?.overall_confidence || data.overall_confidence || 0
    },
    directives: data.directives || [],
    timelines:  data.timelines  || [],
    flags: {
      appeal_mentioned:     data.flags?.appeal_mentioned     || false,
      compliance_mentioned: data.flags?.compliance_mentioned || false,
      penalty_mentioned:    data.flags?.penalty_mentioned    || false
    },
    ai_recommendation: {
      final_recommendation:   data.ai_recommendation?.final_recommendation   || data.final_recommendation  || "N/A",
      final_confidence:       data.ai_recommendation?.final_confidence       || data.final_confidence       || 0,
      decision_reasoning:     data.ai_recommendation?.decision_reasoning     || data.decision_reasoning     || "",
      final_verdict_summary:  data.ai_recommendation?.final_verdict_summary  || data.final_verdict_summary  || "",
      deadline_date:          data.ai_recommendation?.deadline_date          || data.deadline_date          || "",
      responsible_department: data.ai_recommendation?.responsible_department || data.responsible_department || "",
      priority:               data.ai_recommendation?.priority               || data.priority               || "LOW",
      risk_level:             data.ai_recommendation?.risk_level             || data.risk_level             || "LOW",
      action_items:           data.ai_recommendation?.action_items           || data.action_items           || []
    },
    debate: {
      research: {
        recommendation: data.debate?.research?.recommendation || "",
        confidence:     data.debate?.research?.confidence     || 0,
        reasoning:      data.debate?.research?.reasoning      || "",
        key_points:     data.debate?.research?.key_points     || [],
        summary:        data.debate?.research?.summary        || ""
      },
      counter: {
        recommendation:   data.debate?.counter?.recommendation   || "",
        confidence:       data.debate?.counter?.confidence       || 0,
        reasoning:        data.debate?.counter?.reasoning        || "",
        weaknesses_found: data.debate?.counter?.weaknesses_found || [],
        counter_points:   data.debate?.counter?.counter_points   || [],
        summary:          data.debate?.counter?.summary          || ""
      },
      agents_agreed:    data.debate?.agents_agreed    || false,
      comply_arguments: data.debate?.comply_arguments || [],
      appeal_arguments: data.debate?.appeal_arguments || []
    },
    verification_status: data.verification_status || "pending"
  };
}

function normalizePending(item) {
  if (!item) return null;
  return {
    judgment_id:           item.judgment_id || "",
    filename:              item.filename    || "Unknown",
    storage_url:           item.storage_url || "",
    created_at:            item.created_at  || "",
    case_number:           item.case_number    || "N/A",
    court_name:            item.court_name     || "N/A",
    date_of_order:         item.date_of_order  || "N/A",
    petitioner:            item.petitioner     || "N/A",
    respondent:            item.respondent     || "N/A",
    subject_matter:        item.subject_matter || "N/A",
    department:            item.department     || item.department_hint || "N/A",
    final_recommendation:  item.final_recommendation  || "N/A",
    final_confidence:      item.final_confidence      || 0,
    priority:              item.priority              || "LOW",
    deadline_date:         item.deadline_date         || "",
    total_directives:      item.total_directives      || 0,
    flagged_directives:    item.flagged_directives     || item.flagged_count || 0,
    has_low_confidence:    item.has_low_confidence     || false,
    debate_agreed:         item.debate_agreed          || false,
    action_items_count:    item.action_items_count     || 0
  };
}

export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post('/upload/pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const getStatus         = (id)     => client.get(`/upload/status/${id}`);
export const listJudgments     = ()       => client.get('/upload/list');
export const triggerExtraction = (id)     => client.post(`/extract/${id}`);
export const getExtraction     = (id)     => client.get(`/extract/${id}`);
export const runAgents         = (id)     => client.post(`/agents/run/${id}`);
export const getRecommendation = (id)     => client.get(`/agents/${id}/recommendation`);
export const getDebate         = (id)     => client.get(`/agents/${id}/debate`);
export const approveJudgment   = (id, d) => client.post(`/verify/${id}/approve`, d);
export const editJudgment      = (id, d) => client.post(`/verify/${id}/edit`, d);
export const rejectJudgment    = (id, d) => client.post(`/verify/${id}/reject`, d);
export const getVerified       = (params) => client.get('/verify/verified', { params });
export const getAudit          = (id)     => client.get(`/verify/${id}/audit`);

export const getPending = async () => {
  const data = await client.get('/verify/pending');
  return { ...data, items: (data.items || []).map(normalizePending).filter(Boolean) };
};

export const getVerifyDetail = async (id) => {
  const response = await client.get(`/verify/${id}/detail`);
  return normalizeDetail(response);
};

export const getAlertsSummary = () => client.get('/alerts/summary');
export const getAnalyticsOverview = () => client.get('/analytics/overview');
