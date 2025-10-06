# 🏥 Medical Center Management System – Requirements Document

## 1. Project Overview
The **Consulting Center Management System** is a web application for a **private consulting center run by a doctor**.  
It manages patients, appointments, treatments, sessions (invoicing), and reporting — all accessible through a secure **admin panel**.  

The system has only **one admin user** who can log in to manage all operations.  

---

## 2. Technology Stack
- **Framework:** Next.js (JavaScript, not TypeScript)
- **Styling:** Tailwind CSS  
- **Database:** MySQL  
- **ORM:** Prisma  
- **PDF Generation:** For invoices and reports (attractive and professional layout)

---

## 3. Design & Theme
- Overall design: **Modern**, **stylish**, **light-themed**, and **simple yet attractive**
- Fully **responsive** design for desktop and mobile
- **Clean layout** with consistent spacing, rounded corners, and smooth UI animations

---

## 4. Authentication & Access
- **Single Admin User**
  - Admin logs in using credentials (username & password)
  - Accesses all modules from the admin panel after successful login
  - Can log out anytime from the dashboard

- **Validation**
  - Username and password required (no empty fields)
  - Incorrect login shows an error message (e.g., “Invalid username or password”)

---

## 5. Admin Panel Structure
The admin panel contains the following main sections:

1. Dashboard  
2. Patients  
3. Treatments  
4. Appointments  
5. Create Session (Billing & Invoicing)  
6. Reporting  

---

## 6. Dashboard
### Overview:
- Displays key summaries and insights:
  - Total number of patients
  - Total number of treatments
  - Today’s appointments
  - Recent sessions or invoices
- Shows **admin info** (username, role, and logout option)
- **Today’s appointments** are highlighted for quick access

### Design:
- Light-themed, clean, and minimal
- Uses cards and charts for summaries
- Responsive grid layout

---

## 7. Patients Section

### Features:
- **Paginated table** displaying all patients
  - Columns: ID, Name, Address, Phone Number, Email
- **Create New Patient** button
  - Opens a **popup modal** for entering new patient details

### Popup Form Fields:
- **Name** (Required)
- **Address** (Optional)
- **Phone Number** (Required, numeric validation)
- **Email** (Optional, must be a valid email format)

### Validations:
- Name and phone number cannot be empty
- Phone number must be numeric and within a valid length (e.g.071/072, 10 digit max sri lankan valid phone number)
- Email must follow proper email format

### Design:
- Modern, simple, and attractive popup
- Smooth opening/closing animations
- Consistent UI styling with Tailwind

---

## 8. Treatments Section

### Features:
- **List of all treatments** with treatment code, name, and price (in LKR)
- **Create Treatment** button
  - Opens a **popup modal** to add new treatment details

### Popup Form Fields:
- **Treatment Code** (Required, must be unique)
- **Treatment Name** (Required)
- **Price (LKR)** (Required, numeric validation)

### Validations:
- Code, name, and price are mandatory
- Price must be numeric (no negative values)

### Design:
- Clean and modern interface
- Easy to view and update treatment information

---

## 9. Appointments Section

### Features:
- **Dashboard Integration:** Displays today’s appointments  
- **Create Appointment** button to open the appointment form
- **Appointment List** view:
  - Sortable by date
  - Columns: Appointment ID, Patient Name, Date, Time

### Appointment Creation Form:
- **Date** (Required; default = today’s date)
- **Time** (Required)
- **Patient** dropdown:
  - Select from existing patients
  - If patient not found, open a **popup** to create a new patient directly

### Validations:
- All fields required (date, time, patient)
- Date cannot be in the past
- Time must follow HH:MM format

### Design:
- Clean appointment cards or table view
- “Create Appointment” modal follows same design as patient/treatment forms

---

## 10. Create Session (Billing & Invoicing)

### Features:
- **Date Field:** Auto-selected as today’s date (editable if needed)
- **Select Patient:** Dropdown list of patients  
  - Option to add a new patient within a popup (if not found)
- **Select Treatments:** Dropdown to select one or more treatments
  - Selected treatments are added to a **session table**
- **Adjust Price:** Treatment price can be edited for this specific session only (does not affect the main treatment price)
- **Apply Discount:** Optional discount field for the session
- **Add Description:** Optional notes or comments for the session
- **Create Bill:** Generates a **professional, well-designed PDF invoice**

### Session Table Columns:
- Treatment Name
- Quantity (optional, defaults to 1)
- Unit Price
- Discount (optional)
- Total per treatment
- Session Total

### PDF Invoice Requirements:
- Attractive and professional layout
- Includes:
  - Clinic Name and Logo
  - Patient Details
  - Treatment List with adjusted prices and discounts
  - Total Amount
  - Date and Session ID
- Printable PDF format

### Validations:
- Patient selection required
- At least one treatment must be added
- Prices and discounts must be valid numbers

---

## 11. Reporting Section

### Features:
- Generate reports by selecting a **Start Date** and **End Date**
- **View Report** button generates a **table of sessions** within that period
- **Columns in Report Table:**
  - Session ID
  - Date
  - Patient Name
  - Description
  - Total Value
- **Export to PDF**:
  - Exports a professional, formatted PDF version of the report
  - Suitable for printing and record-keeping

### Validations:
- Start date and end date required
- End date must not be before start date

### Design:
- Simple, elegant, and clear table layout
- Buttons styled with Tailwind for consistency

---

## 12. Database Structure (Main Entities)

| Table | Fields | Description |
|-------|---------|-------------|
| **Admin** | id, username, password | Single admin login |
| **Patients** | id, name, address, phone, email | Patient details |
| **Treatments** | id, code, name, price | Treatment data |
| **Appointments** | id, patient_id, date, time | Appointment schedule |
| **Sessions** | id, patient_id, date, description, discount, total | Billing sessions |
| **Session_Treatments** | id, session_id, treatment_id, adjusted_price | Treatments per session |
| **Reports (generated dynamically)** | — | Based on session data |

---

## 13. PDF Design Standards
- Use clinic name and branding at the top
- Professional typography (clear headings, readable body text)
- Table layout for data clarity
- Light borders and subtle background highlights
- Include totals, dates, and page numbers where needed

---

## 14. Future Enhancements (Now not on our task list this is optional)
- Add SMS/email notifications for appointments
- Multi-user access (doctor + receptionist)
- Chart-based analytics in Dashboard
- Cloud backups of reports and invoices

---

## 15. Summary
This system provides:
- A **fully manageable consulting center system**
- A **single, secure admin panel**
- Modern UI with **Tailwind CSS**
- Dynamic data handling via **Next.js and Prisma**
- **Professional PDF exports** for both invoices and reports

---

## 🔐 Database Configuration

The following database credentials should be used for the setup:

- **Username:** root  
- **Password:** Ravindra#7808  
- **Host:** localhost  
- **Port:** 3306  
  


