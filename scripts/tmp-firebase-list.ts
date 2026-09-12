import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey } as never) });
  }

  const result = await getAuth().listUsers(1000);
  console.log(
    JSON.stringify(
      {
        projectId,
        total: result.users.length,
        users: result.users.map((u) => ({
          uid: u.uid,
          email: u.email,
          createdAt: u.metadata.creationTime,
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, message: String(error) }));
  process.exit(1);
});
