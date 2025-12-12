# Monero RPC Dashboard

A comprehensive web application for managing and monitoring Monero nodes through RPC interface with multi-configuration support, real-time monitoring, and modern responsive design.

## 🚀 Features

### 🔧 Multi-RPC Configuration
- **SQLite Database**: Store multiple RPC configurations securely
- **Easy Switching**: Switch between different Monero nodes seamlessly  
- **Authentication Support**: Username/password authentication when required
- **Connection Testing**: Test connections before saving configurations
- **HTTPS Support**: Secure connections with SSL/TLS support

### 📊 Real-time Network Monitoring
- **Live Network Stats**: Blockchain height, connections, difficulty
- **WebSocket Updates**: Real-time data push every 5 seconds via Socket.IO
- **Interactive Charts**: Four real-time Chart.js visualizations (hashrate, connections, difficulty, txpool)
- **Sync Status**: Real-time synchronization monitoring with visual indicators
- **Node Information**: Version, uptime, update availability alerts
- **Database Metrics**: Storage usage and free space monitoring
- **Auto-refresh**: Configurable refresh intervals (5-300 seconds)

### 🧪 Advanced Tools
- **Block Search**: Search blocks by height or hash with detailed information
- **Transaction Pool**: Monitor pending transactions with live updates
- **Fee Estimation**: Get current network fee estimates
- **Custom RPC Calls**: Execute any RPC method with JSON parameters
- **Block Visualization**: Animated block representation with TX pool

### 🔐 Authentication & Security
- **RBAC System**: Role-Based Access Control with admin and viewer roles
- **Session Management**: Secure cookie-based sessions with bcrypt password hashing
- **Protected Routes**: Configuration panel accessible only to admin users
- **Default Admin**: Initial admin/admin credentials (must be changed on first login)
- **Forced Password Change**: First login requires mandatory password change for security
- **Login Modal**: Clean authentication interface with logout functionality

### 📈 Data Management & Notifications
- **Historical Data**: Automatic storage of network statistics every 30 seconds
- **Data Retention**: 30-day rolling window for historical metrics
- **Smart Notifications**: Multi-level alert system (info, warning, error, success)
- **Toast Alerts**: Real-time visual notifications for important events
- **Notification Panel**: Centralized notification center with read/unread status
- **Auto-cleanup**: Automatic removal of old data and read notifications

### 🌍 Internationalization
- **Multi-language Support**: Italian and English with easy extensibility
- **Dynamic Loading**: Language files loaded dynamically
- **Complete Translation**: All UI elements, messages, and errors translated

### 🎨 Modern User Interface
- **Dark/Light Themes**: Toggle between themes with persistent preference and dynamic chart colors
- **Responsive Design**: Mobile-first design that works on all devices
- **Collapsible Sections**: Organize information with expandable cards
- **Smooth Animations**: CSS transitions and animated components
- **Modular CSS**: 11 separate CSS modules for maintainability (charts, auth, etc.)

## 📋 Requirements

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **Monero daemon** with RPC enabled

## 🛠 Installation

1. **Clone the repository:**
```bash
git clone https://github.com/R-Caser/Monero-RPC-Dashboard
cd Monero-RPC-Dashboard
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the application:**
```bash
npm start
```

4. **Open in browser:**
```
http://localhost:3000
```

## ⚙️ Configuration

### Initial Setup
1. Open the application in your browser
2. Click the **⚙️ Configuration** button
3. Add your Monero node details:
   - Host/IP address
   - Port (default: 18081)
   - Enable HTTPS if needed
   - Add authentication if required
4. Test the connection
5. Save and activate the configuration

### Multiple Nodes
- Add multiple RPC configurations
- Switch between nodes instantly
- Each configuration stores connection details securely
- Test connections before activation

### Settings
- **Auto-refresh**: Enable automatic data updates
- **Refresh Interval**: Set update frequency (5-300 seconds)
- **Language**: Choose between Italian and English
- **Theme**: Select dark or light mode

## 🏗 Project Structure

```
Monero-RPC-Dashboard/
├── src/
│   ├── server.js          # Express server, WebSocket, and API routes
│   ├── database.js        # SQLite database with 5 tables
│   ├── moneroRPC.js       # Monero RPC client wrapper
│   └── auth.js            # RBAC middleware and authentication
├── public/
│   ├── index.html         # Main application HTML
│   ├── app.js            # Frontend JavaScript logic
│   ├── i18n.js           # Internationalization system
│   ├── charts.js         # Chart.js configuration and updates
│   ├── websocket.js      # Socket.IO client for real-time updates
│   ├── auth.js           # Frontend authentication and notifications
│   ├── css/              # Modular CSS stylesheets
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── header.css
│   │   ├── cards.css
│   │   ├── forms.css
│   │   ├── info-grid.css
│   │   ├── config.css
│   │   ├── block-visualization.css
│   │   ├── charts.css    # Real-time charts styling
│   │   ├── auth.css      # Authentication and notifications styling
│   │   └── responsive.css
│   └── i18n/             # Translation files
│       ├── it-IT.js      # Italian translations
│       ├── en-US.js      # English translations
│       └── es-ES.js      # Spanish translations (example)
├── data/
│   └── config.db         # SQLite database (auto-created)
└── docs/                 # Additional documentation
```

## 🔌 API Endpoints

### Configuration Management
- `GET /api/config` - List all saved configurations
- `GET /api/config/active` - Get currently active configuration
- `GET /api/config/:id` - Get specific configuration
- `POST /api/config` - Create new configuration
- `PUT /api/config/:id` - Update configuration
- `DELETE /api/config/:id` - Delete configuration
- `POST /api/config/:id/activate` - Activate configuration
- `POST /api/config/test` - Test connection

### Monero RPC Proxy
- `GET /api/health` - Check RPC connection status
- `GET /api/info` - Get node information (get_info)
- `GET /api/sync-info` - Get synchronization status
- `GET /api/height` - Get blockchain height
- `GET /api/block-count` - Get block count
- `GET /api/block/:identifier` - Get block by height or hash
- `GET /api/transaction-pool` - Get transaction pool
- `GET /api/connections` - Get connection information
- `GET /api/difficulty` - Get network difficulty
- `GET /api/version` - Get daemon version
- `GET /api/fee-estimate` - Get fee estimation
- `POST /api/rpc` - Execute custom RPC calls

### Application Settings
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update application settings

### Authentication & Authorization
- `GET /api/auth/session` - Check current session
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout and destroy session
- `POST /api/auth/change-password` - Change user password

### Historical Data & Analytics
- `GET /api/historical-data` - Get historical network statistics
- Query params: `period` (1h, 24h, 7d, 30d), `metric` (hashrate, difficulty, connections, txpool)

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

### WebSocket Events
- `network-stats` - Real-time network statistics broadcast (every 5s)
- `notification` - New notification pushed to clients

### Internationalization
- `GET /api/i18n/languages` - Get available languages

## 🖥 Key Features Overview

### Main Dashboard
- Real-time network information with WebSocket updates
- Four interactive Chart.js visualizations
- Sync status with visual indicators
- Node version and update alerts
- Database and storage metrics
- Live notification panel with badge counter

### Real-Time Statistics
- **Hashrate Chart**: Network hashrate over time
- **Connections Chart**: Active peer connections
- **Difficulty Chart**: Mining difficulty progression
- **TX Pool Chart**: Pending transactions count
- Dynamic theme-aware chart colors

### Authentication & Security
- Secure login modal with session management
- Role-based access control (admin/viewer)
- Protected configuration panel
- Password change functionality

### Configuration Panel (Admin Only)
- Multiple RPC configurations
- Connection testing
- Secure credential storage with bcrypt
- Easy switching between nodes

### Data & Notifications
- Historical data storage (30-day retention)
- Multi-level notification system
- Toast notifications for real-time alerts
- Notification panel with read/unread status

### Advanced Tools
- Block search and exploration
- Transaction pool monitoring
- Custom RPC call interface
- Fee estimation tools

## 🌐 Browser Support

- **Chrome** 88+
- **Firefox** 85+
- **Safari** 14+
- **Edge** 88+

## 🚀 Technologies

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time WebSocket communication
- **SQLite3** - Embedded database with 5 tables
- **bcryptjs** - Secure password hashing
- **express-session** - Session management
- **cookie-parser** - Cookie handling
- **Axios** - HTTP client for RPC calls

### Frontend
- **Vanilla JavaScript** - No frameworks, pure JS
- **Chart.js** - Interactive real-time charts
- **Socket.IO Client** - WebSocket client for live updates
- **CSS3** - Modern styling with variables and grid
- **HTML5** - Semantic markup

### Features
- **RESTful API** - Clean API design
- **Responsive Design** - Mobile-first approach
- **Progressive Enhancement** - Works without JavaScript
- **Accessibility** - ARIA labels and keyboard navigation

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style
- Add translations for new text
- Test on multiple screen sizes
- Ensure accessibility compliance

## 📝 License

This project is licensed under the **GPL-3.0 License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Wiki**: Check the Wiki for additional documentation

## 🔗 Related Projects

- **Monero**: https://getmonero.org/
- **Monero RPC Documentation**: https://docs.getmonero.org/rpc-library/monerod-rpc

## 🎯 Roadmap

### ✅ Completed
- [x] Chart visualizations for network stats (Chart.js with 4 real-time charts)
- [x] WebSocket support for real-time updates (Socket.IO)
- [x] Historical data storage (30-day rolling window)
- [x] Alert notifications (Multi-level notification system with toast alerts)
- [x] Authentication system (RBAC with admin/viewer roles)
- [x] Forced password change on first login (Default admin must change password)
- [x] Block-based statistics updates (Real-time stats update on new blocks)

### 🔜 Planned Features
- [ ] **Export/Import configurations** - Backup and restore RPC configurations
- [ ] **Additional language translations** - French, German, Spanish, Portuguese
- [ ] **Custom dashboard widgets** - Drag-and-drop customizable dashboard layout
- [ ] **Mobile app wrapper** - React Native or Capacitor mobile app
- [ ] **Advanced analytics** - Detailed historical charts with zoom and pan
- [ ] **Multi-user management** - Create/edit/delete users with different roles
- [ ] **Email notifications** - SMTP integration for critical alerts
- [ ] **API rate limiting** - Protection against excessive requests
- [ ] **Backup/restore database** - Automated database backup system
- [ ] **Monero mining stats** - Mining pool integration and statistics
- [ ] **Network topology map** - Visual representation of peer connections
- [ ] **Performance metrics** - CPU, RAM, disk I/O monitoring
- [ ] **Docker support** - Containerized deployment with Docker Compose
- [ ] **Two-factor authentication** - TOTP-based 2FA for enhanced security
- [ ] **Webhook integrations** - Discord, Slack, Telegram notifications
- [ ] **Block explorer integration** - Deep-dive into block and transaction details

---

**Made with ❤️ for the Monero Community**
4Ax8oTCSZMn3Up5JCG9V7XZPd4JvC9JPY9YdrqjbGDvi2oSsqfp8SZFL22C2bYrtuP52GZuhhZEsUXXY8rc7WSmAGBkWhDW
