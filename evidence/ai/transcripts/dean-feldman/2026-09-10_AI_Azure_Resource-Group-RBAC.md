# Add Resource Group Contributors

**User:** Anonymous  
**Created:** 9/10/2026 16:24:37  
**Updated:** 9/10/2026 16:30:35  
**Exported:** 9/14/2026 15:14:44  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa2bda4-f204-83e9-858c-2bff6485be6a](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa2bda4-f204-83e9-858c-2bff6485be6a)  

## Prompt:
9/10/2026, 4:24:45 PM

help me add contributors to the resource group

## Response:
9/10/2026, 4:24:48 PM

> **Addinging contributors**
>
> I’m recommending resource-group-scoped **Contributor** access for each teammate. In Azure Portal: Resource groups → `rg-statsthegame-dev` → Access control (IAM) → Add role assignment → Contributor → select users or groups → Review + assign.
> 
> No condition is needed.
>
> **Added contributors**
>
> 
>
> **Clarifying permissions**
>
> I’m keeping the main grant simple: assign **Contributor** at `rg-statsthegame-dev` scope with no condition. If deployment must create role assignments, I’m separating that need because Contributor alone cannot manage Azure RBAC permissions.
>
> **Clarified permissions**
>
> 
>
> **Searched 1 website**
>
> 
>
> Worked for 23s

For your project, add each teammate as **Contributor at the resource-group scope**. That gives them access to manage the Azure resources in the group without giving subscription-wide access. Microsoft recommends assigning roles at the narrowest required scope. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?utm_source=chatgpt.com))

### Azure Portal steps

For your current dev resource group:

**Azure Portal → Resource groups → `rg-statsthegame-dev` → Access control (IAM)**

Then:

1. Click **+ Add → Add role assignment**.
2. Under **Job function roles**, select **Contributor**.
3. Click **Next**.
4. Choose **User, group, or service principal**.
5. Click **+ Select members**.
6. Search for each teammate's Microsoft/Azure account email.
7. You can select **multiple teammates** here.
8. Click **Select → Review + assign → Review + assign**.

For a normal **Contributor** assignment, you do **not need a role-assignment condition**. Conditions are optional and mainly relevant to certain data-access or delegated RBAC scenarios. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-role-assignments-portal?utm_source=chatgpt.com))

For your SDP setup, I would give teammates these permissions:

| Role | Scope | Give to teammate? | Purpose |
|---|---|---:|---|
| **Contributor** | `rg-statsthegame-dev` | ✅ Yes | Manage/deploy App Service, Service Bus, Storage, etc. |
| **Storage Blob Data Reader** | Storage account/container | ✅ If testing ingestion | Read staged blobs |
| **Azure Service Bus Data Sender** | Service Bus namespace | ✅ If testing batch submission | Send messages |
| **Azure Service Bus Data Receiver** | Service Bus namespace | ✅ If testing workers | Receive messages |
| **Role Based Access Control Administrator** | Resource group | ⚠️ Only if required | Allows deployments that create RBAC assignments |
| **Owner** | Resource group/subscription | ❌ Avoid | More privilege than the team needs |

The important distinction is that **Contributor cannot create Azure role assignments**. Microsoft requires `Microsoft.Authorization/roleAssignments/write`, available through roles such as **Role Based Access Control Administrator**. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?utm_source=chatgpt.com))

So if your Bicep deployment contains things like:

```bicep
resource roleAssignment 'Microsoft.Authorization/roleAssignments@...' = {
    ...
}
```

then whoever runs that deployment will need **Role Based Access Control Administrator** as well as Contributor. You do **not** need to give that to every teammate unless they actually need to run the infrastructure deployment.

**For now: add all teammates as `Contributor` on `rg-statsthegame-dev`.** After that, tell me what screen Azure shows you and I'll guide you through the **Service Bus + Storage roles** as well.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

---

**Sources:**

- [Assign Azure roles using the Azure portal - Azure RBAC | Microsoft Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?utm_source=chatgpt.com)

## Prompt:
9/10/2026, 4:28:44 PM

idk which roe to choose

[Attachment: Pasted markdown.md]

## Response:
9/10/2026, 4:28:46 PM

> **Choosing the role**
>
> I’m recommending the built-in **Contributor** role—the generic entry, not a service-specific contributor role. It lets members manage resources in the resource group, but not assign permissions. fileciteturn0file0
>
> Worked for 10s

Choose the plain built-in role **`Contributor`** - not `Container Apps Contributor`, `API Management Service Contributor`, or any of the other service-specific Contributor roles. Your screen is currently showing a huge alphabetical list of 263 roles. `Pasted markdown.md`

In **Add role assignment → Role**:

1. Stay on **Job function roles**.
2. Use the search/filter box and type:
   **`Contributor`**
3. Select the role whose name is exactly **Contributor**.
4. Its description should say approximately that it can **manage all resources**, but **cannot assign Azure RBAC roles**.
5. Click **Next**.
6. Select **User, group, or service principal**.
7. Add your teammate(s).
8. **Review + assign**.

Do **not** choose any role with extra words before/after Contributor.

If you send me the next screen after searching `Contributor`, I can tell you exactly which row to click.

## Prompt:
9/10/2026, 4:30:12 PM

[Attachment: Pasted markdown.md]

[Attachment: Pasted markdown (3).md]

[Attachment: Pasted markdown (3).md]

## Response:
9/10/2026, 4:30:15 PM

> **Locating the role**
>
> I’m comparing the visible role list and alphabetical ordering. The standalone “Contributor” role appears to be missing from these pages, so I’m checking whether it belongs to another category or requires a different filter.
>
> **Located the role**
>
> 
>
> Worked for 15s

You’re on the **wrong tab**. That’s why you cannot find plain `Contributor`.

Your Azure screen has two tabs: **Job function roles** and **Privileged administrator roles**. You’re currently looking through the 263 Job function roles. `Pasted markdown (3).md`

Click:

**`Privileged administrator roles`**

Then select:

> **Contributor**

The role name should be **exactly `Contributor`** - nothing before or after it.

After selecting it:

**Next → User, group, or service principal → Select members → choose your teammate(s) → Review + assign**

Do **not** select `Storage Account Contributor`, `Website Contributor`, `Container Apps Contributor`, etc. Those are narrower service-specific roles. `Pasted markdown.md`

Send me the **Privileged administrator roles** screen if you want me to tell you exactly which row to select.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)