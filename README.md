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

### 🌍 Internationalization
- **Multi-language Support**: Italian and English with easy extensibility
- **Dynamic Loading**: Language files loaded dynamically
- **Complete Translation**: All UI elements, messages, and errors translated

### 🎨 Modern User Interface
- **Dark/Light Themes**: Toggle between themes with persistent preference
- **Responsive Design**: Mobile-first design that works on all devices
- **Collapsible Sections**: Organize information with expandable cards
- **Smooth Animations**: CSS transitions and animated components
- **Modular CSS**: 9 separate CSS modules for maintainability

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
│   ├── server.js          # Express server and API routes
│   ├── database.js        # SQLite database management
│   └── moneroRPC.js       # Monero RPC client wrapper
├── public/
│   ├── index.html         # Main application HTML
│   ├── app.js            # Frontend JavaScript logic
│   ├── i18n.js           # Internationalization system
│   ├── css/              # Modular CSS stylesheets
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── header.css
│   │   ├── cards.css
│   │   ├── forms.css
│   │   ├── info-grid.css
│   │   ├── config.css
│   │   ├── block-visualization.css
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

### Internationalization
- `GET /api/i18n/languages` - Get available languages

## 🖥 Screenshots

### Main Dashboard
- Real-time network information
- Sync status with visual indicators
- Node version and update alerts
- Database and storage metrics

### Configuration Panel
- Multiple RPC configurations
- Connection testing
- Secure credential storage
- Easy switching between nodes

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
- **SQLite3** - Embedded database
- **Axios** - HTTP client for RPC calls

### Frontend
- **Vanilla JavaScript** - No frameworks, pure JS
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
- **Monero RPC Documentation**: https://www.getmonero.org/resources/developer-guides/daemon-rpc.html

## 🎯 Roadmap

- [ ] Export/Import configurations
- [ ] Chart visualizations for network stats
- [ ] WebSocket support for real-time updates
- [ ] Mobile app wrapper
- [ ] Additional language translations
- [ ] Custom dashboard widgets
- [ ] Historical data storage
- [ ] Alert notifications

---

**Made with ❤️ for the Monero Community**
4Ax8oTCSZMn3Up5JCG9V7XZPd4JvC9JPY9YdrqjbGDvi2oSsqfp8SZFL22C2bYrtuP52GZuhhZEsUXXY8rc7WSmAGBkWhDW
