# Security Spec: PT Fit Firestore Access Controls & Rules Audit

This document defines the strict Attribute-Based Access Control (ABAC) invariants and security specifications for PT Fit. It includes the "Dirty Dozen" malicious attack payloads designed to violate system constraints and maps them to secure, mathematically-provable Firestore security rule validations.

---

## 1. Core Data Invariants

1. **User Accounts (`/users/{userId}`)**
   - **Identity Integrity**: Users can only read and write their own user profile document (`request.auth.uid == userId`), with exceptions for coaches and admins.
   - **Role Escalation Defense**: Standard users are forbidden from self-assigning high-privilege roles like `admin` or `coach`. Initial registration role can be "trainee" or "coach", but must be created with status `pending`.
   - **Approval Safeguard**: Standard users cannot modify their own approval `status` to bypass administrative vetting.
   - **Subscription Integrity**: Trainees cannot activate or modify their own subscription statuses or dates; subscription state changes must be restricted to their coach or an admin.

2. **Programs (`/programs/{traineeId}`)**
   - **Trainee Access**: Trainees can only read their own program. They can never modify a program sheet.
   - **Coach Authority**: Only the assigned coach (`coachId == request.auth.uid`) or an admin can create or modify a trainee's program.

3. **Progress Logs (`/progress/{logId}`)**
   - **Trainee Ownership**: Trainees can only create and read progress logs that reference their own `traineeId` matching `request.auth.uid`.
   - **Coach Overlook**: The assigned coach can read their trainee's progress logs but cannot modify or inject log entries on behalf of the trainee.

4. **Messages & Chats (`/messages/{msgId}`, `/chats/{chatId}`)**
   - **Dialogue Privacy**: Direct chat messages and summary documents can only be read or written by the specific participants (`request.auth.uid` is in `participants` or `chatId` splits).
   - **Sender Identity Mismatch**: The `senderId` field in any message document must strictly match `request.auth.uid`.

5. **Notifications (`/notifications/{notifId}`)**
   - **Target Delivery**: Users can read, update (mark read), or delete notifications addressed to them (`userId == request.auth.uid`).
   - **Pushed Notification Integrity**: Anyone authenticated can write a notification to another user, but they cannot read existing notifications of other users.

6. **Exercise Video Library (`/exercise_videos/{videoId}`)**
   - **Read Access**: Read access is public to all authenticated users.
   - **Modification Authority**: Only administrators can create, update, or delete exercise video library items.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following specific JSON payloads represent malicious attempts to bypass access controls. All of them must yield `PERMISSION_DENIED` under the security rules.

### Payload 1: Identity Spoofing (Write to another user's profile)
- **Path**: `/users/victim_user_abc`
- **Attempt**: Trainee user `attacker_123` attempts to write or overwrite user profile details of `victim_user_abc`.
- **Malicious Payload**:
```json
{
  "uid": "victim_user_abc",
  "name": "Victim User",
  "email": "victim@example.com",
  "phone": "+1234567890",
  "role": "trainee",
  "status": "approved",
  "createdAt": "2026-06-29T16:13:29Z"
}
```

### Payload 2: Privilege Escalation (Self-Assigning Role "admin")
- **Path**: `/users/attacker_123`
- **Attempt**: Trainee attempts to elevate their own role to `admin` or `coach`.
- **Malicious Payload**:
```json
{
  "uid": "attacker_123",
  "name": "Attacker",
  "email": "attacker@example.com",
  "phone": "+1999999999",
  "role": "admin",
  "status": "approved",
  "createdAt": "2026-06-29T16:13:29Z"
}
```

### Payload 3: Status Shortcutting (Self-Approving Pending Account)
- **Path**: `/users/attacker_123`
- **Attempt**: A pending user attempts to approve themselves by sending status as `approved` on initial creation or update.
- **Malicious Payload**:
```json
{
  "uid": "attacker_123",
  "name": "Attacker",
  "email": "attacker@example.com",
  "phone": "+1999999999",
  "role": "trainee",
  "status": "approved",
  "createdAt": "2026-06-29T16:13:29Z"
}
```

### Payload 4: Subscription Theft (Self-Activating Premium Status)
- **Path**: `/users/attacker_123` (Trainee UID)
- **Attempt**: Trainee tries to update their own document to mark subscription as active without making a payment or receiving coach activation.
- **Malicious Payload**:
```json
{
  "subscriptionStatus": "active",
  "subscriptionDuration": "1 Year",
  "subscriptionExpiry": "2027-06-29T16:13:29Z"
}
```

### Payload 5: Unauthorized Program Modification (Cheating Workouts)
- **Path**: `/programs/attacker_123` (Trainee's own program)
- **Attempt**: Trainee user attempts to write or edit their own exercise sheets, removing harder exercises.
- **Malicious Payload**:
```json
{
  "id": "attacker_123",
  "traineeId": "attacker_123",
  "coachId": "coach_xyz",
  "workoutDays": [],
  "dietMeals": [],
  "updatedAt": "2026-06-29T16:13:29Z"
}
```

### Payload 6: Orphaned Program Assignment (Interfering Coach)
- **Path**: `/programs/trainee_456`
- **Attempt**: Coach `attacker_coach` attempts to update/set program rules for `trainee_456`, who has subscription under coach `coach_xyz`.
- **Malicious Payload**:
```json
{
  "id": "trainee_456",
  "traineeId": "trainee_456",
  "coachId": "attacker_coach",
  "workoutDays": [
    {
      "id": "day_1",
      "dayName": "Malicious Day",
      "exercises": []
    }
  ],
  "dietMeals": [],
  "updatedAt": "2026-06-29T16:13:29Z"
}
```

### Payload 7: Progress Log Hijacking (Spoofing workout logging)
- **Path**: `/progress/log_fake_999`
- **Attempt**: User `attacker_123` logs a completed workout session on behalf of user `victim_user_abc` to get credits or fake coaching accountability.
- **Malicious Payload**:
```json
{
  "id": "log_fake_999",
  "traineeId": "victim_user_abc",
  "workoutDayId": "mon_routine",
  "workoutDayName": "Leg Day",
  "completedAt": "2026-06-29T16:13:29Z",
  "notes": "Yes, I finished everything!"
}
```

### Payload 8: Message Sender Spoofing (Faking messages)
- **Path**: `/messages/msg_malicious_100`
- **Attempt**: User `attacker_123` sends a message with `senderId: "coach_xyz"` inside the victim's channel.
- **Malicious Payload**:
```json
{
  "id": "msg_malicious_100",
  "chatId": "coach_xyz_attacker_123",
  "senderId": "coach_xyz",
  "text": "Your subscription is terminated, do not contact me again.",
  "createdAt": "2026-06-29T16:13:29Z"
}
```

### Payload 9: Dialogue Privacy Leak (Querying other chats)
- **Path**: `/messages/msg_private_456`
- **Attempt**: Authenticated user `attacker_123` tries to list/read private messages in chatId `coach_abc_trainee_def`.
- **Query / Get Target**: `getDoc(doc(db, "messages", "msg_private_456"))` where participants do not include `attacker_123`.

### Payload 10: Notification Snooping & Interference
- **Path**: `/notifications/notif_victim_777`
- **Attempt**: User `attacker_123` attempts to write/delete the notification inbox of `victim_user_abc` to cover up alerts.
- **Malicious Payload**:
```json
{
  "read": true
}
```

### Payload 11: Library Poisoning (Adding fake exercise videos)
- **Path**: `/exercise_videos/video_fake_321`
- **Attempt**: Trainee `attacker_123` attempts to upload a malicious/irrelevant video into the global training library database.
- **Malicious Payload**:
```json
{
  "name": "Free Gym Passes Promo Link",
  "muscleGroup": "Chest",
  "videoUrl": "https://phishing-site.example.com",
  "createdAt": "2026-06-29T16:13:29Z"
}
```

### Payload 12: Directory Query Harvesting (Bulk scraping profiles)
- **Path**: `/users` (Collection)
- **Attempt**: Trainee user tries to read `/users` without limiting query to their own UID or assigned coach relationship, scraping the phone numbers and personal details of all other coaches/trainees.
- **Query Target**: `getDocs(collection(db, "users"))` executed by non-admin standard account.

---

## 3. Test Runner Schema (Simulation verification)

A simulated firestore security rules test verifying that each of the "Dirty Dozen" is rejected:

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

describe("PT Fit Zero-Trust Access Rules Security Audit", () => {
  it("rejects Payload 1: Identity Spoofing", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("users/victim_user_abc").set({
        uid: "victim_user_abc",
        name: "Victim User",
        email: "victim@example.com"
      })
    );
  });

  it("rejects Payload 2: Privilege Escalation", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("users/attacker_123").set({
        uid: "attacker_123",
        role: "admin",
        status: "approved"
      })
    );
  });

  it("rejects Payload 3: Self-Approval of Account", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("users/attacker_123").set({
        uid: "attacker_123",
        role: "trainee",
        status: "approved"
      })
    );
  });

  it("rejects Payload 4: Direct subscription changes by Trainee", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("users/attacker_123").update({
        subscriptionStatus: "active"
      })
    );
  });

  it("rejects Payload 5: Unauthorized program modification", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("programs/attacker_123").set({
        workoutDays: []
      })
    );
  });

  it("rejects Payload 6: Orphaned Program Assignment by rogue coach", async () => {
    const db = getTestEnv().authenticatedContext("attacker_coach").firestore();
    await assertFails(
      db.doc("programs/trainee_456").set({
        coachId: "attacker_coach"
      })
    );
  });

  it("rejects Payload 7: Logging progress on behalf of others", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("progress/log_fake_999").set({
        traineeId: "victim_user_abc",
        workoutDayId: "mon_routine"
      })
    );
  });

  it("rejects Payload 8: Chat messages senderId spoofing", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("messages/msg_malicious_100").set({
        senderId: "coach_xyz",
        text: "Spoofed Message"
      })
    );
  });

  it("rejects Payload 9: Reading other user's private messages", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("messages/msg_private_456").get()
    );
  });

  it("rejects Payload 10: Writing to another user's notifications", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("notifications/notif_victim_777").update({
        read: true
      })
    );
  });

  it("rejects Payload 11: Exercise video guide additions by trainee", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.doc("exercise_videos/video_fake_321").set({
        name: "Malicious Guide"
      })
    );
  });

  it("rejects Payload 12: Bulk harvesting user profile database directory", async () => {
    const db = getTestEnv().authenticatedContext("attacker_123").firestore();
    await assertFails(
      db.collection("users").get()
    );
  });
});
```
