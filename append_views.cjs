const fs = require('fs');

const viewsCode = `

views.relationshipManagerDashboard = function(user, applications = []) {
  let activeAppsRows = '';
  
  if (applications.length === 0) {
    activeAppsRows = '<tr><td colspan="6" style="text-align: center; padding: 32px;">No applications assigned to you.</td></tr>';
  } else {
    applications.forEach(app => {
      activeAppsRows += \`
        <tr>
          <td><strong>\${app.applicant_name}</strong><br><small style="color: var(--text-light);">\${app.applicant_phone}</small></td>
          <td>\${app.loan_product_name}</td>
          <td>RWF \${parseFloat(app.amount).toLocaleString()}</td>
          <td><span class="badge badge-\${app.status}">\${app.status.replace(/_/g, ' ')}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="app.openRMUploadModal('\${app.id}', '\${app.applicant_name}')">
              <i data-lucide="upload" style="width:14px;height:14px;margin-right:4px;"></i> Upload Doc
            </button>
            <button class="btn btn-primary btn-sm" onclick="app.openRMForwardModal('\${app.id}', '\${app.applicant_name}')">
              <i data-lucide="send" style="width:14px;height:14px;margin-right:4px;"></i> Forward to CM
            </button>
          </td>
        </tr>
      \`;
    });
  }

  const counters = {
    pending: applications.filter(a => a.status !== 'approved' && a.status !== 'rejected').length,
    total: applications.length
  };

  return \`
    <section class="dashboard-container container">
      <div class="dashboard-header" style="background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0)); backdrop-filter: blur(10px); padding: 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 32px;">
        <div class="user-profile-summary">
          <div class="user-avatar-placeholder" style="background: linear-gradient(135deg, #FF9A9E, #FECFEF); color: white;">\${user.fullName.substring(0,2).toUpperCase()}</div>
          <div class="user-meta">
            <h2 style="margin-bottom:4px;">Relationship Manager Portal</h2>
            <p>Welcome, \${user.fullName} &bull; Manage client documents and forward applications</p>
          </div>
        </div>
      </div>

      <div class="analytics-counters">
        <div class="counter-card accent-active" style="background: linear-gradient(135deg, #a18cd1, #fbc2eb); color: white;">
          <div class="counter-info">
            <h4 style="color: white;">Pending Client Files</h4>
            <h2 style="color: white;">\${counters.pending}</h2>
          </div>
          <div class="counter-icon"><i data-lucide="users"></i></div>
        </div>
        <div class="counter-card" style="border-left: 4px solid var(--accent-color);">
          <div class="counter-info">
            <h4>Total Assigned</h4>
            <h2>\${counters.total}</h2>
          </div>
          <div class="counter-icon"><i data-lucide="folder"></i></div>
        </div>
      </div>

      <div class="card" style="margin-top: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <div class="card-header">
          <h3 style="font-size: 18px; margin-bottom: 0;">Assigned Applications</h3>
        </div>
        <div class="table-responsive">
          <table class="custom-table" style="width: 100%;">
            <thead>
              <tr>
                <th>Client Details</th>
                <th>Loan Product</th>
                <th>Requested Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              \${activeAppsRows}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  \`;
};

views.creditManagerDashboard = function(user, applications = []) {
  let activeAppsRows = '';
  
  if (applications.length === 0) {
    activeAppsRows = '<tr><td colspan="6" style="text-align: center; padding: 32px;">No applications assigned to you.</td></tr>';
  } else {
    applications.forEach(app => {
      activeAppsRows += \`
        <tr>
          <td><strong>\${app.applicant_name}</strong><br><small style="color: var(--text-light);">\${app.applicant_phone}</small></td>
          <td>\${app.loan_product_name}</td>
          <td>RWF \${parseFloat(app.amount).toLocaleString()}</td>
          <td><span class="badge badge-\${app.status}">\${app.status.replace(/_/g, ' ')}</span></td>
          <td><i data-lucide="activity" style="color: var(--accent-color); width: 14px; height: 14px; display: inline;"></i> \${app.credit_score_estimate}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="app.openOfficerReviewModal('\${app.id}')">
              <i data-lucide="file-check-2" style="width:14px;height:14px;margin-right:4px;"></i> Review & Approve
            </button>
          </td>
        </tr>
      \`;
    });
  }

  const counters = {
    pending: applications.filter(a => a.status === 'under_review' || a.status === 'submitted').length,
    total: applications.length
  };

  return \`
    <section class="dashboard-container container">
      <div class="dashboard-header" style="background: linear-gradient(135deg, #141E30, #243B55); padding: 24px; border-radius: 16px; color: white; margin-bottom: 32px;">
        <div class="user-profile-summary">
          <div class="user-avatar-placeholder" style="background-color: var(--accent-color); color: white; border: 2px solid white;">\${user.fullName.substring(0,2).toUpperCase()}</div>
          <div class="user-meta">
            <h2 style="color: white; margin-bottom:4px;">Credit Manager Terminal</h2>
            <p style="color: #94a3b8;">Welcome, \${user.fullName} &bull; Finalize loan approvals securely</p>
          </div>
        </div>
      </div>

      <div class="analytics-counters">
        <div class="counter-card" style="border-left: 4px solid #ef4444;">
          <div class="counter-info">
            <h4>Awaiting Decision</h4>
            <h2>\${counters.pending}</h2>
          </div>
          <div class="counter-icon"><i data-lucide="alert-circle" style="color:#ef4444;"></i></div>
        </div>
        <div class="counter-card" style="border-left: 4px solid var(--status-approved);">
          <div class="counter-info">
            <h4>Total Assigned</h4>
            <h2>\${counters.total}</h2>
          </div>
          <div class="counter-icon"><i data-lucide="inbox"></i></div>
        </div>
      </div>

      <div class="card" style="margin-top: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <div class="card-header">
          <h3 style="font-size: 18px; margin-bottom: 0;">Escalated Applications Queue</h3>
        </div>
        <div class="table-responsive">
          <table class="custom-table" style="width: 100%;">
            <thead>
              <tr>
                <th>Client Details</th>
                <th>Loan Product</th>
                <th>Requested Amount</th>
                <th>Status</th>
                <th>CRB Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              \${activeAppsRows}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  \`;
};

`;

let content = fs.readFileSync('d:/MBI logo/Imali Hub/frontend/public/js/views.js', 'utf8');
content = content.replace('window.views = views;', viewsCode + '\\nwindow.views = views;');
fs.writeFileSync('d:/MBI logo/Imali Hub/frontend/public/js/views.js', content, 'utf8');
console.log('Appended views to views.js');
