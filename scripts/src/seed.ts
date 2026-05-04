import bcrypt from "bcryptjs";
import { db, usersTable, leadsTable, notesTable, followupsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const [admin] = await db
    .insert(usersTable)
    .values({ name: "Admin User", email: "admin@crm.com", passwordHash, role: "admin" })
    .onConflictDoNothing()
    .returning();

  const userId = admin?.id ?? (await db.select().from(usersTable).where(eq(usersTable.email, "admin@crm.com")))[0].id;
  console.log("Admin user ready, id:", userId);

  // Seed leads
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

  const insertedLeads = await db.insert(leadsTable).values(leadsData).onConflictDoNothing().returning();
  console.log(`Seeded ${insertedLeads.length} leads`);

  // Get all leads
  const allLeads = await db.select().from(leadsTable);

  // Seed notes for first 3 leads
  const notesData = [
    { leadId: allLeads[0].id, content: "Called Sarah, she's evaluating 3 vendors. Follow up next week.", authorId: userId },
    { leadId: allLeads[0].id, content: "Sent product deck. Positive initial feedback.", authorId: userId },
    { leadId: allLeads[1].id, content: "Had a 45-min discovery call. Michael confirmed budget approved for Q2.", authorId: userId },
    { leadId: allLeads[1].id, content: "Sent proposal draft. Awaiting sign-off from legal team.", authorId: userId },
    { leadId: allLeads[2].id, content: "Emily referenced working with a competitor last year. Key differentiator: our support.", authorId: userId },
    { leadId: allLeads[3].id, content: "James requested a live demo for his team. Scheduled for next Thursday.", authorId: userId },
    { leadId: allLeads[4].id, content: "Contract signed! Amanda is a champion internally.", authorId: userId },
    { leadId: allLeads[5].id, content: "Initial inquiry from contact form. Tech-savvy, asked detailed API questions.", authorId: userId },
  ];

  await db.insert(notesTable).values(notesData);
  console.log("Seeded notes");

  // Seed follow-ups
  const now = new Date();
  const future = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const past = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const followupsData = [
    { leadId: allLeads[0].id, description: "Send competitive comparison doc", dueDate: future(2), completed: false },
    { leadId: allLeads[0].id, description: "Schedule product demo call", dueDate: future(5), completed: false },
    { leadId: allLeads[1].id, description: "Follow up on legal review", dueDate: future(1), completed: false },
    { leadId: allLeads[2].id, description: "Call to discuss integration timeline", dueDate: future(3), completed: false },
    { leadId: allLeads[3].id, description: "Prepare custom demo environment", dueDate: past(1), completed: false },
    { leadId: allLeads[5].id, description: "Send API documentation", dueDate: future(7), completed: false },
    { leadId: allLeads[6].id, description: "Initial discovery call", dueDate: past(2), completed: true, completedAt: past(1) },
    { leadId: allLeads[7].id, description: "Send case studies for retail industry", dueDate: future(4), completed: false },
  ];

  await db.insert(followupsTable).values(followupsData);
  console.log("Seeded follow-ups");

  // Seed activity
  const activityData = [
    { type: "lead_created", message: 'New lead "Carlos Mendez" was added', leadId: allLeads[9].id },
    { type: "lead_created", message: 'New lead "David Park" was added', leadId: allLeads[5].id },
    { type: "lead_status_changed", message: '"James Thompson" status changed to proposal', leadId: allLeads[3].id },
    { type: "note_added", message: 'Note added to "Michael Chen"', leadId: allLeads[1].id },
    { type: "followup_scheduled", message: 'Follow-up scheduled for "Emily Rodriguez"', leadId: allLeads[2].id },
    { type: "lead_status_changed", message: '"Amanda Walsh" status changed to converted', leadId: allLeads[4].id },
    { type: "note_added", message: 'Note added to "Sarah Johnson"', leadId: allLeads[0].id },
    { type: "followup_completed", message: 'Follow-up completed for "Lisa Martinez"', leadId: allLeads[6].id },
    { type: "lead_created", message: 'New lead "Sarah Johnson" was added', leadId: allLeads[0].id },
    { type: "lead_status_changed", message: '"Robert Kim" status changed to qualified', leadId: allLeads[7].id },
  ];

  await db.insert(activityTable).values(activityData);
  console.log("Seeded activity");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
