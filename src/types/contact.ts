export type ContactTopic =
  | "tool-not-working"
  | "report-a-bug"
  | "request-a-tool"
  | "general-feedback"
  | "other";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  topic: string;
  relatedTool: string;
  message: string;
  technicalDetails: string;
  createdAt: string;
  status: "new";
};
