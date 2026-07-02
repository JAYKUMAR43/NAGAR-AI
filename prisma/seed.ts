import { PrismaClient } from "@prisma/client";
import { VectorStore } from "../src/lib/vectorStore";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

// Ward Centers
const wardCenters = {
  "Ward 1": { lat: 12.9716, lng: 77.5946 }, // Central
  "Ward 2": { lat: 12.9982, lng: 77.5926 }, // North
  "Ward 3": { lat: 12.9250, lng: 77.5896 }, // South
  "Ward 4": { lat: 12.9782, lng: 77.6406 }, // East
  "Ward 5": { lat: 12.9602, lng: 77.5306 }  // West
};

const categories = ["waste", "water", "road", "electricity", "safety"] as const;
const statuses = ["pending", "routed", "in_progress", "resolved"];
const urgencies = ["low", "medium", "high", "critical"];

const citizenNames = [
  "Amit Sharma", "Priya Patel", "Rajesh Kumar", "Sunita Rao", "Vijay Singh",
  "Anjali Desai", "Rohan Mehta", "Deepa Nair", "Karan Johar", "Neha Gupta",
  "Suresh Babu", "Kavitha Reddy", "Vikram Sen", "Meera Joshi", "Arjun Prasad"
];

const mockDescriptions = {
  waste: [
    "Overflowing trash bin near the public park entrance. Garbage is spilling onto the footpath.",
    "Illegal dumping of construction debris and cement bags by the roadside, blocking pedestrian access.",
    "A pile of plastic waste and organic garbage has been left uncollected at the street corner for 4 days.",
    "Missed garbage collection by the sanitation truck for three consecutive cycles on this street.",
    "Litter and dry leaves accumulating in the drainage channel next to the public school.",
    "Public dustbins in the shopping street are broken, causing garbage to scatter everywhere."
  ],
  water: [
    "Major drinking water pipeline leakage on the main avenue. Water is gushing onto the road.",
    "Sewage water overflowing from an open manhole, causing foul smell and health hazard.",
    "Extremely low water pressure in the residential sector for the last three days.",
    "Tap water supplied this morning is turbid and brown, making it unusable for household chores.",
    "Stormwater drain is completely clogged with silt and plastic bottles, causing waterlogging after rain.",
    "Leak in the valve of the public borewell station, wasting gallons of clean water."
  ],
  road: [
    "Large pothole in the middle of the fast lane, forcing vehicles to swerve dangerously.",
    "Broken footpath paving blocks near the metro station, causing a tripping hazard for seniors.",
    "Missing manhole cover on the side alley. Very dangerous for night pedestrians.",
    "Speed breaker is not painted and lacks reflectors, causing vehicle damage at night.",
    "A series of deep potholes near the flyover entrance making traffic slow down and congest.",
    "Cracked road surface and asphalt erosion stretching over 50 meters near the market area."
  ],
  electricity: [
    "Streetlights on the main residential lane are not working. The entire block is completely dark.",
    "Hanging live electrical wire from the overhead pole, dangling dangerously low over the footpath.",
    "The local transformer is making loud sparking noises and tripping frequently during peak hours.",
    "Feeder pillar box door is wide open, exposing high voltage fuses to kids playing around.",
    "Frequent voltage fluctuations burning out domestic electronic appliances in this sector.",
    "A streetlight has been glowing continuously during daylight hours, wasting energy."
  ],
  safety: [
    "A pack of aggressive stray dogs has gathered near the bus stand, chasing pedestrians and cyclists.",
    "Lack of pedestrian crossing signal or zebra crossing at this busy four-way junction.",
    "An abandoned rusted hatchback parked on the shoulder, blocking the view of turning traffic.",
    "Dark alley behind the market has become an active spot for anti-social elements due to zero lighting.",
    "Illegal street vendors encroaching upon the fire lane next to the community center.",
    "Construction scaffolding on the sidewalk is unstable and lacks protective netting."
  ]
};

const departments = {
  waste: "Sanitation & Waste Management Dept",
  water: "Water Supply & Sewerage Board",
  road: "Public Works Department (PWD)",
  electricity: "Electricity Board (Smart Grid)",
  safety: "City Safety & Security Division"
};

// Helper to generate a date spread over the last 30 days
function getRandomDateWithinDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  // Randomize hour/minute
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date;
}

// Generate deterministic coordinates offset from center
function getRandomCoordinate(center: { lat: number, lng: number }) {
  const offsetLat = (Math.random() - 0.5) * 0.015;
  const offsetLng = (Math.random() - 0.5) * 0.015;
  return {
    latitude: parseFloat((center.lat + offsetLat).toFixed(6)),
    longitude: parseFloat((center.lng + offsetLng).toFixed(6))
  };
}

async function main() {
  console.log("Starting Database Seeding...");

  // 1. Clear database
  await prisma.complaint.deleteMany({});
  await prisma.policy.deleteMany({});
  await prisma.official.deleteMany({});
  await prisma.actionLog.deleteMany({});
  console.log("Existing complaints, policies, officials, and action logs cleared.");

  // Clear local vector store
  VectorStore.delete("all", "complaint");
  VectorStore.delete("all", "policy");
  console.log("Vector store reset.");

  // 2. Create Policy Documents
  const policies = [
    {
      title: "Municipal Waste Handling Guidelines",
      content: "All dry waste must be segregated from wet waste before disposal. Construction waste disposal on public footpaths is prohibited and subject to a fine of $500. Commercial establishments must schedule bulk collections through the Sanitation & Waste Management Dept.",
      category: "waste"
    },
    {
      title: "Water Utility Service Standard",
      content: "The Water Supply & Sewerage Board guarantees potable water delivery for a minimum of 4 hours daily. Complaints of brown/turbid water are routed as critical and must be inspected within 24 hours. Leaking water mains must be repaired within 12 hours of reporting.",
      category: "water"
    },
    {
      title: "Road and Pavement Maintenance Code",
      content: "Potholes on arterial roads must be filled using hot-mix asphalt within 48 hours of detection. Footpath repairs are managed by the Public Works Department (PWD) and prioritized based on pedestrian volume near schools, hospitals, and transit hubs.",
      category: "road"
    },
    {
      title: "Electrical Utility & Lighting Regulations",
      content: "Streetlight outages must be resolved by the Electricity Board within 72 hours. Hanging power lines or exposed fuses are classified as Immediate Safety Hazards and must be isolated and made safe within 2 hours of notification.",
      category: "electricity"
    },
    {
      title: "Public Safety and Right-of-Way Code",
      content: "Sidewalk encroachments blocking pedestrian traffic are strictly illegal. Stray animal control is coordinated by the City Safety & Security Division. Traffic signs and zebra crossings must be repainted every 12 months for safety.",
      category: "safety"
    }
  ];

  console.log("Seeding policy documents...");
  const dbPolicies = [];
  for (const pol of policies) {
    const createdPol = await prisma.policy.create({
      data: {
        title: pol.title,
        content: pol.content,
        category: pol.category
      }
    });
    dbPolicies.push(createdPol);
    
    // Embed and save to Vector Store
    await VectorStore.add(
      createdPol.id,
      "policy",
      `Policy - ${createdPol.title}: ${createdPol.content}`,
      { title: createdPol.title, category: createdPol.category || "general" }
    );
  }
  console.log(`Seeded ${dbPolicies.length} policy documents.`);

  // 3. Generate complaints
  const seedComplaints: any[] = [];

  // Generate 55 general distributed complaints
  for (let i = 0; i < 55; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const wardName = `Ward ${Math.floor(Math.random() * 5) + 1}` as keyof typeof wardCenters;
    const center = wardCenters[wardName];
    const { latitude, longitude } = getRandomCoordinate(center);
    
    const descriptions = mockDescriptions[category];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const assignedDept = departments[category];
    
    const citizenName = citizenNames[Math.floor(Math.random() * citizenNames.length)];
    const citizenPhone = `+91 98765 ${String(10000 + Math.floor(Math.random() * 90000)).slice(1)}`;

    const titleOptions = {
      waste: ["Garbage Overflow", "Construction Debris Dumped", "Uncollected Litter", "Missed Sanitation Pickup"],
      water: ["Water Pipeline Leak", "Sewage Overflow", "Low Water Pressure", "Brown Tap Water Supply"],
      road: ["Deep Dangerous Pothole", "Broken Pedestrian Walkway", "Missing Manhole Lid", "Unmarked Speed Breaker"],
      electricity: ["Streetlight Outage", "Dangling Electric Wire", "Transformer Sparking", "Exposed Feeder Pillar Box"],
      safety: ["Stray Dog Menace", "Missing Zebra Crossing", "Abandoned Vehicle Obstruction", "Dark Alley Hazard"]
    };

    const titles = titleOptions[category];
    const title = titles[Math.floor(Math.random() * titles.length)];

    seedComplaints.push({
      title: `${title} in ${wardName}`,
      description,
      category,
      urgency,
      ward: wardName,
      status,
      assignedDept,
      latitude,
      longitude,
      citizenName,
      citizenPhone,
      createdAt: getRandomDateWithinDays(30)
    });
  }

  // 4. Inject Anomaly Clusters!
  // Anomaly 1: Water leakage spike in Ward 3 on a single day (e.g. 5 days ago)
  const anomalyDate1 = new Date();
  anomalyDate1.setDate(anomalyDate1.getDate() - 5);
  anomalyDate1.setHours(10, 0);

  const waterAnomalyReports = [
    "Major pipe burst on Outer Ring Road, Ward 3. Street is completely flooded.",
    "Water gushing out from pavement tiles outside shopping plaza in Ward 3.",
    "Low pressure and air coming out of taps in Ward 3 South Sector, likely due to a burst main.",
    "Water leakage in public drinking stand near Ward 3 subway.",
    "Large pool of freshwater collected near Ward 3 temple due to utility pipeline crack."
  ];

  for (const desc of waterAnomalyReports) {
    const center = wardCenters["Ward 3"];
    const { latitude, longitude } = getRandomCoordinate(center);
    seedComplaints.push({
      title: "Water Pipeline Leakage (Ward 3)",
      description: desc,
      category: "water",
      urgency: "high",
      ward: "Ward 3",
      status: "pending",
      assignedDept: departments["water"],
      latitude,
      longitude,
      citizenName: citizenNames[Math.floor(Math.random() * citizenNames.length)],
      citizenPhone: "+91 99001 23456",
      createdAt: anomalyDate1
    });
  }

  // Anomaly 2: Streetlight outages in Ward 1 on a single day (e.g. 12 days ago)
  const anomalyDate2 = new Date();
  anomalyDate2.setDate(anomalyDate2.getDate() - 12);
  anomalyDate2.setHours(21, 15);

  const electricityAnomalyReports = [
    "Entire block of Sector D in Ward 1 is pitch black. None of the streetlights are glowing.",
    "Dark residential street in Ward 1 causing safety concerns. Three poles have failed lamps.",
    "Streetlight flickering rapidly and emitting a buzzing sound near Ward 1 park.",
    "Ward 1 central avenue lights went off suddenly after a small spark on the terminal pole.",
    "Failed public lighting near Ward 1 subway making it extremely unsafe for late commuters."
  ];

  for (const desc of electricityAnomalyReports) {
    const center = wardCenters["Ward 1"];
    const { latitude, longitude } = getRandomCoordinate(center);
    seedComplaints.push({
      title: "Streetlight Outage (Ward 1)",
      description: desc,
      category: "electricity",
      urgency: "medium",
      ward: "Ward 1",
      status: "routed",
      assignedDept: departments["electricity"],
      latitude,
      longitude,
      citizenName: citizenNames[Math.floor(Math.random() * citizenNames.length)],
      citizenPhone: "+91 98860 65432",
      createdAt: anomalyDate2
    });
  }

  // Seed officials
  console.log("Seeding official accounts...");
  const officials = [
    {
      email: "officer1@nagarai.gov",
      password: "password",
      name: "Rajesh Kumar",
      department: "Sanitation & Waste Management Dept",
      wardAssigned: "Ward 1"
    },
    {
      email: "officer2@nagarai.gov",
      password: "password",
      name: "Priya Patel",
      department: "Water Supply & Sewerage Board",
      wardAssigned: "Ward 3"
    },
    {
      email: "officer3@nagarai.gov",
      password: "password",
      name: "Amit Sharma",
      department: "Public Works Department (PWD)",
      wardAssigned: "Ward 2"
    }
  ];
  for (const off of officials) {
    await prisma.official.create({
      data: off
    });
  }
  console.log(`Seeded ${officials.length} official accounts.`);

  console.log(`Seeding ${seedComplaints.length} complaints to Database and Vector Store (in batches)...`);
  
  // Save to DB and Vector Store sequentially or in small chunks
  // to avoid hitting rate limits on Gemini Embeddings if active
  let count = 0;
  for (const comp of seedComplaints) {
    const dbComp = await prisma.complaint.create({
      data: comp
    });
    
    // Add to vector store
    await VectorStore.add(
      dbComp.id,
      "complaint",
      `Complaint in ${dbComp.ward} (${dbComp.category} issue): ${dbComp.title} - ${dbComp.description}`,
      {
        title: dbComp.title,
        category: dbComp.category,
        ward: dbComp.ward,
        urgency: dbComp.urgency,
        status: dbComp.status,
        createdAt: dbComp.createdAt.toISOString()
      }
    );

    // Create Action Logs based on the status
    const createdDate = new Date(dbComp.createdAt);
    
    if (dbComp.status === "routed" || dbComp.status === "in_progress" || dbComp.status === "resolved") {
      // Step 1: System automated routing
      const routeDate = new Date(createdDate.getTime() + 10 * 60 * 1000); // +10 minutes
      await prisma.actionLog.create({
        data: {
          complaintId: dbComp.id,
          timestamp: routeDate,
          actionType: "Status change",
          notes: `AI Classified category as '${dbComp.category}' and routed to ${dbComp.assignedDept}.`,
          officialName: "Nagar AI System"
        }
      });
    }

    if (dbComp.status === "in_progress" || dbComp.status === "resolved") {
      // Step 2: Department assignment / field visit
      const assignDate = new Date(createdDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      // Find a matching officer for the department, fallback to a name
      let officerName = "Officer Assigned";
      if (dbComp.category === "waste") officerName = "Rajesh Kumar";
      else if (dbComp.category === "water") officerName = "Priya Patel";
      else if (dbComp.category === "road") officerName = "Amit Sharma";
      
      await prisma.actionLog.create({
        data: {
          complaintId: dbComp.id,
          timestamp: assignDate,
          actionType: "Field visit logged",
          notes: `Official ${officerName} assigned to inspect the site. Site check scheduled.`,
          officialName: officerName
        }
      });
    }

    if (dbComp.status === "resolved") {
      // Step 3: Resolved
      const resolveDate = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000); // +1 day
      let officerName = "Officer Assigned";
      if (dbComp.category === "waste") officerName = "Rajesh Kumar";
      else if (dbComp.category === "water") officerName = "Priya Patel";
      else if (dbComp.category === "road") officerName = "Amit Sharma";

      await prisma.actionLog.create({
        data: {
          complaintId: dbComp.id,
          timestamp: resolveDate,
          actionType: "Mark resolved",
          notes: `Issue resolved. Maintenance team completed repair and debris cleared. Verified resolution.`,
          officialName: officerName
        }
      });
    }
    
    count++;
    if (count % 10 === 0) {
      console.log(`  Processed ${count} / ${seedComplaints.length} complaints...`);
    }
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
