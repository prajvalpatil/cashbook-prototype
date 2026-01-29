# Construction Project Cashbook Prototype

A complete, live, interactive web-based prototype for managing construction project finances. This application allows tracking of cash flow, material expenses, labor wages, and service costs with role-based access.

## Features

-   **Role-Based Access Control**: Admin (Full Access) vs Member (Limited Access).
-   **Project Management**: Create and manage multiple construction projects.
-   **Cashbook**: Track Cash In and Cash Out (Material, Labor, Services).
-   **Ledgers**: Automated Supplier and Labor ledgers.
-   **Dashboard**: Real-time financial overview.
-   **Attachments**: Upload and preview receipts/images (stored locally).
-   **Reports**: Filterable reports with Excel and PDF export.
-   **Persistence**: All data is saved in the browser's LocalStorage.

## Tech Stack

-   HTML5, CSS3, JavaScript (ES6+)
-   Bootstrap 5 (UI Framework)
-   SheetJS (Excel Export)
-   jsPDF (PDF Export)
-   LocalStorage (No backend required)

## How to Use

1.  **Open the Application**:
    -   Simply open `index.html` in any modern web browser.
    -   Or deploy to GitHub Pages (see below).

2.  **Login**:
    -   **Admin**: username: `admin`, password: `password`
    -   **Member**: username: `member`, password: `password`

3.  **Workflow**:
    -   **Create a Project**: (Admin only) Go to Projects -> New Project.
    -   **Select Project**: Use the dropdown in the top header.
    -   **Add Entries**: Go to Cashbook -> Add Cash In / Cash Out.
    -   **View Reports**: (Admin only) Go to Reports -> Export Excel/PDF.

## Deployment to GitHub Pages

Since this application requires no backend, it can be hosted directly on GitHub Pages.

1.  Create a new repository on GitHub.
2.  Push all files (`index.html`, `css/`, `js/`) to the repository.
3.  Go to **Settings** -> **Pages**.
4.  Under **Source**, select `main` branch and `/root` folder.
5.  Click **Save**. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Data Persistence

Note that all data is stored in your browser's **LocalStorage**. 
-   If you clear your browser cache, data will be lost.
-   Data is not shared between devices or browsers.

## Directory Structure

```
/
├── index.html          # Main application entry point
├── css/
│   └── style.css       # Custom styles
├── js/
│   ├── app.js          # Core application logic & UI handling
│   ├── storage.js      # Data persistence & schema management
│   └── reports.js      # Reporting & Export logic
└── README.md           # Documentation
```
