import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  UserModel,
  LeadModel,
  NoteModel,
  FollowupModel,
  ActivityModel,
  getNextId,
} from "@workspace/db";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB. Seeding database...");

  await Promise.all([
    UserModel.deleteMany({}),
    LeadModel.deleteMany({}),
    NoteModel.deleteMany({}),
    FollowupModel.deleteMany({}),
    ActivityModel.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("admin123", 12);
  const adminId = await getNextId("users");
  const admin = await new UserModel({
    id: adminId,
    name: "Admin User",
    email: "admin@crm.com",
    passwordHash,
    role: "admin",
  }).save();
  console.log("Admin user created, id:", admin.id);

  const leadsData = [
    { name: "Sarah Johnson", email: "sarah.j@techcorp.com", phone: "+1 (555) 234-5678", company: "TechCorp Inc.", source: "Website Form", status: "new", value: 18500 },
    { name: "Michael Chen", email: "mchen@globalventures.io", phone: "+1 (555) 345-6789", company: "Global Ventures", source: "LinkedIn", status: "contacted", value: 42000 },
    { name: "Emily Rodriguez", email: "emily.r@designstudio.co", phone: "+1 (555) 456-7890", company: "Design Studio Co.", source: "Referral", status: "qualified", value: 12000 },
    { name: "James Thompson", email: "jt@apexsolutions.com", phone: "+1 (555) 567-8901", company: "Apex Solutions", source: "Website Form", status: "proposal", value: 75000 },
    { name: "Amanda Walsh", email: "awalsh@brightfuture.org", phone: "+1 (555) 678-9012", company: "Bright Future NGO", source: "Email Campaign", status: "converted", value: 28000 },
    { name: "David Park", email: "dpark@innovateai.tech", phone: "+1 (555) 789-0123", company: "InnovateAI", source: "Website Form", status: "new", value: 55000 },
    { name: "Lisa Martinez", email: "lisa.m@marketingplus.com", phone: "+1 (555) 890-1234", company: "MarketingPlus", source: "Referral", status: "contacted", value: 9500 },
    { name: "Robert Kim", email: "rkim@cloudnative.dev", phone: "+1 (555) 901-2345", company: "CloudNative Dev", source: "Conference", status: "qualified", value: 31000 },
    { name: "Jennifer White", email: "jwhite@retailchain.com", phone: "+1 (555) 012-3456", company: "RetailChain Corp", source: "LinkedIn", status: "lost", value: 22000 },
    { name: "Carlos Mendez", email: "cmendez@financeforward.com", phone: "+1 (555) 123-4567", company: "Finance Forward", source: "Website Form", status: "new", value: 48000 },
    { name: "Patricia Brown", email: "pbrown@healthtech.io", phone: "+1 (555) 234-5670", company: "HealthTech IO", source: "Email Campaign", status: "contacted", value: 16500 },
    { name: "Thomas Wilson", email: "twilson@eduplatform.net", phone: "+1 (555) 345-6780", company: "EduPlatform", source: "Referral", status: "converted", value: 35000 },
  ];

  const insertedLeads = [];
  for (const data of leadsData) {
    const id = await getNextId("leads");
    const lead = await new LeadModel({ id, ...data }).save();
    insertedLeads.push(lead);
  }
  console.log(`Seeded ${insertedLeads.length} leads`);

  const notesData = [
    { leadId: insertedLeads[0].id, content: "Called Sarah, she's evaluating 3 vendors. Follow up next week.", authorId: adminId },
    { leadId: insertedLeads[0].id, content: "Sent product deck. Positive initial feedback.", authorId: adminId },
    { leadId: insertedLeads[1].id, content: "Had a 45-min discovery call. Michael confirmed budget approved for Q2.", authorId: adminId },
    { leadId: insertedLeads[1].id, content: "Sent proposal draft. Awaiting sign-off from legal team.", authorId: adminId },
    { leadId: insertedLeads[2].id, content: "Emily referenced working with a competitor last year. Key differentiator: our support.", authorId: adminId },
    { leadId: insertedLeads[3].id, content: "James requested a live demo for his team. Scheduled for next Thursday.", authorId: adminId },
    { leadId: insertedLeads[4].id, content: "Contract signed! Amanda is a champion internally.", authorId: adminId },
    { leadId: insertedLeads[5].id, content: "Initial inquiry from contact form. Tech-savvy, asked detailed API questions.", authorId: adminId },
  ];

  for (const data of notesData) {
    const id = await getNextId("notes");
    await new NoteModel({ id, ...data }).save();
  }
  console.log("Seeded notes");

  const now = new Date();
  const future = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const past = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const followupsData = [
    { leadId: insertedLeads[0].id, description: "Send competitive comparison doc", dueDate: future(2), completed: false },
    { leadId: insertedLeads[0].id, description: "Schedule product demo call", dueDate: future(5), completed: false },
    { leadId: insertedLeads[1].id, description: "Follow up on legal review", dueDate: future(1), completed: false },
    { leadId: insertedLeads[2].id, description: "Call to discuss integration timeline", dueDate: future(3), completed: false },
    { leadId: insertedLeads[3].id, description: "Prepare custom demo environment", dueDate: past(1), completed: false },
    { leadId: insertedLeads[5].id, description: "Send API documentation", dueDate: future(7), completed: false },
    { leadId: insertedLeads[6].id, description: "Initial discovery call", dueDate: past(2), completed: true, completedAt: past(1) },
    { leadId: insertedLeads[7].id, description: "Send case studies for retail industry", dueDate: future(4), completed: false },
  ];

  for (const data of followupsData) {
    const id = await getNextId("followups");
    await new FollowupModel({ id, ...data }).save();
  }
  console.log("Seeded follow-ups");

  const activityData = [
    { type: "lead_created", message: 'New lead "Carlos Mendez" was added', leadId: insertedLeads[9].id },
    { type: "lead_created", message: 'New lead "David Park" was added', leadId: insertedLeads[5].id },
    { type: "lead_status_changed", message: '"James Thompson" status changed to proposal', leadId: insertedLeads[3].id },
    { type: "note_added", message: 'Note added to "Michael Chen"', leadId: insertedLeads[1].id },
    { type: "followup_scheduled", message: 'Follow-up scheduled for "Emily Rodriguez"', leadId: insertedLeads[2].id },
    { type: "lead_status_changed", message: '"Amanda Walsh" status changed to converted', leadId: insertedLeads[4].id },
    { type: "note_added", message: 'Note added to "Sarah Johnson"', leadId: insertedLeads[0].id },
    { type: "followup_completed", message: 'Follow-up completed for "Lisa Martinez"', leadId: insertedLeads[6].id },
    { type: "lead_created", message: 'New lead "Sarah Johnson" was added', leadId: insertedLeads[0].id },
    { type: "lead_status_changed", message: '"Robert Kim" status changed to qualified', leadId: insertedLeads[7].id },
  ];

  for (const data of activityData) {
    const id = await getNextId("activity");
    await new ActivityModel({ id, ...data }).save();
  }
  console.log("Seeded activity");

  console.log("Seeding complete!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
