import { Router, type IRouter } from "express";
import {
  CreateApplicationBody,
  GetApplicationParams,
  GetCertificateParams,
  GetReceiptParams,
  GetServiceParams,
  ListServicesQueryParams,
  LoginBody,
  UpdateApplicationBody,
  UpdateApplicationParams,
} from "@workspace/api-zod";

type Service = {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  departmentName: string;
  description: string;
  fee: number;
  documents: string[];
  process: string[];
};

type Application = {
  id: number;
  applicationNumber: string;
  serviceId: number;
  serviceName: string;
  applicantName: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  remarks: string | null;
};

const departments = [
  { id: 1, name: "Revenue Department", code: "REV" },
  { id: 2, name: "Social Welfare Department", code: "SWD" },
  { id: 3, name: "Tamil Nadu e-Governance Agency", code: "TNeGA" },
  { id: 4, name: "Employment and Training", code: "E&T" },
  { id: 5, name: "Municipal Administration", code: "MAWS" },
];

const services: Service[] = [
  { id: 1, code: "REV-101", name: "Income Certificate", departmentId: 1, departmentName: "Revenue Department", description: "Certificate of annual family income issued by the Revenue Department for education, scholarships and government benefits.", fee: 60, documents: ["Aadhaar Card", "Family Card", "Address Proof", "Self Declaration"], process: ["Submit application with supporting documents", "Village Administrative Officer verification", "Revenue Inspector review", "Certificate issued online"] },
  { id: 2, code: "REV-102", name: "Community Certificate", departmentId: 1, departmentName: "Revenue Department", description: "Official community certificate for residents of Tamil Nadu.", fee: 60, documents: ["Aadhaar Card", "Address Proof", "Parent Community Certificate"], process: ["Submit application", "Field verification", "Tahsildar approval", "Download certificate"] },
  { id: 3, code: "REV-103", name: "Nativity Certificate", departmentId: 1, departmentName: "Revenue Department", description: "Proof of nativity and permanent residence in Tamil Nadu.", fee: 60, documents: ["Aadhaar Card", "Birth Certificate", "Address Proof"], process: ["Submit application", "Document verification", "Certificate issued"] },
  { id: 4, code: "REV-104", name: "Residence Certificate", departmentId: 1, departmentName: "Revenue Department", description: "Certificate confirming the applicant's current residence.", fee: 60, documents: ["Aadhaar Card", "EB Bill or Ration Card", "Self Declaration"], process: ["Apply online", "Local officer verification", "Download certificate"] },
  { id: 5, code: "REV-105", name: "First Graduate Certificate", departmentId: 1, departmentName: "Revenue Department", description: "Certificate for students who are the first graduates in their family.", fee: 60, documents: ["Aadhaar Card", "Transfer Certificate", "Parent Declaration"], process: ["Submit application", "Family record verification", "Certificate approval"] },
  { id: 6, code: "SWD-201", name: "Old Age Pension Application", departmentId: 2, departmentName: "Social Welfare Department", description: "Apply for social security pension assistance.", fee: 0, documents: ["Aadhaar Card", "Bank Passbook", "Age Proof"], process: ["Submit application", "Local body review", "Benefits activated"] },
  { id: 7, code: "ET-301", name: "Employment Registration", departmentId: 4, departmentName: "Employment and Training", description: "Register as a job seeker with the Employment Exchange.", fee: 0, documents: ["Aadhaar Card", "Educational Certificates", "Address Proof"], process: ["Create registration", "Upload qualification details", "Registration number issued"] },
  { id: 8, code: "MAWS-401", name: "Birth Certificate Extract", departmentId: 5, departmentName: "Municipal Administration", description: "Request a certified extract of a birth record.", fee: 30, documents: ["Hospital Record", "Parent Aadhaar Card"], process: ["Submit request", "Records office verification", "Extract issued"] },
];

let applications: Application[] = [
  { id: 1, applicationNumber: "TNREV20260824001", serviceId: 1, serviceName: "Income Certificate", applicantName: "Aswath Kumar", status: "Approved", submittedAt: "2026-08-18", updatedAt: "2026-08-22", remarks: null },
  { id: 2, applicationNumber: "TNREV20260824002", serviceId: 2, serviceName: "Community Certificate", applicantName: "Aswath Kumar", status: "Under Process", submittedAt: "2026-08-21", updatedAt: "2026-08-21", remarks: "Application is being reviewed by the Revenue Inspector." },
];

const portalRouter: IRouter = Router();

portalRouter.post("/auth/login", (req, res) => {
  const input = LoginBody.parse(req.body);
  if (!input.email || !input.password) return res.status(401).json({ error: "Email and password are required" });
  return res.json({ id: 1, email: input.email, firstName: "Aswath", lastName: "Kumaresh", role: "CITIZEN" });
});

portalRouter.get("/departments", (_req, res) => res.json(departments));

portalRouter.get("/services", (req, res) => {
  const query = ListServicesQueryParams.parse(req.query);
  const filtered = services.filter((service) =>
    (!query.departmentId || service.departmentId === query.departmentId) &&
    (!query.search || `${service.name} ${service.code} ${service.departmentName}`.toLowerCase().includes(query.search.toLowerCase())) &&
    (!query.letter || service.name.toUpperCase().startsWith(query.letter.toUpperCase())),
  );
  const pageSize = query.pageSize ?? 10;
  const page = query.page ?? 1;
  const start = (page - 1) * pageSize;
  res.json({ items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) });
});

portalRouter.get("/services/:id", (req, res) => {
  const { id } = GetServiceParams.parse(req.params);
  const service = services.find((item) => item.id === id);
  if (!service) return res.status(404).json({ error: "Service not found" });
  return res.json(service);
});

portalRouter.post("/applications", (req, res) => {
  const input = CreateApplicationBody.parse(req.body);
  const service = services.find((item) => item.id === input.serviceId);
  if (!service) return res.status(404).json({ error: "Service not found" });
  const id = Math.max(0, ...applications.map((item) => item.id)) + 1;
  const now = new Date().toISOString().slice(0, 10);
  const application: Application = { id, applicationNumber: `TN${service.code.replace("-", "")}${Date.now().toString().slice(-6)}`, serviceId: service.id, serviceName: service.name, applicantName: input.applicantName, status: "Submitted", submittedAt: now, updatedAt: now, remarks: null };
  applications = [application, ...applications];
  return res.status(201).json(application);
});

portalRouter.get("/applications/:id", (req, res) => {
  const { id } = GetApplicationParams.parse(req.params);
  const application = applications.find((item) => item.id === id);
  if (!application) return res.status(404).json({ error: "Application not found" });
  return res.json(application);
});

portalRouter.put("/applications/:id", (req, res) => {
  const { id } = UpdateApplicationParams.parse(req.params);
  const input = UpdateApplicationBody.parse(req.body);
  const index = applications.findIndex((item) => item.id === id);
  if (index === -1) return res.status(404).json({ error: "Application not found" });
  applications[index] = { ...applications[index], applicantName: input.applicantName, updatedAt: new Date().toISOString().slice(0, 10), status: "Submitted" };
  return res.json(applications[index]);
});

portalRouter.get("/applications/:id/certificate", (req, res) => {
  const { id } = GetCertificateParams.parse(req.params);
  const application = applications.find((item) => item.id === id);
  if (!application) return res.status(404).json({ error: "Application not found" });
  return res.json({ applicationNumber: application.applicationNumber, certificateNumber: `CERT-${application.id}2026`, issuedOn: application.updatedAt, serviceName: application.serviceName, applicantName: application.applicantName, downloadUrl: `/api/applications/${id}/certificate` });
});

portalRouter.get("/applications/:id/receipt", (req, res) => {
  const { id } = GetReceiptParams.parse(req.params);
  const application = applications.find((item) => item.id === id);
  const service = application && services.find((item) => item.id === application.serviceId);
  if (!application || !service) return res.status(404).json({ error: "Application not found" });
  return res.json({ applicationNumber: application.applicationNumber, receiptNumber: `RCP-${application.id}2026`, amount: service.fee, paidOn: application.submittedAt });
});

portalRouter.get("/dashboard", (_req, res) => {
  res.json({ totalApplications: applications.length, pending: applications.filter((item) => ["Submitted", "Under Process"].includes(item.status)).length, completed: applications.filter((item) => item.status === "Approved").length, returned: applications.filter((item) => item.status === "Returned").length, recentApplications: applications.slice(0, 5) });
});

export default portalRouter;