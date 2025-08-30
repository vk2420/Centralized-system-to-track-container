# 🚢 Warehouse Container Tracking System

A centralized container tracking system for warehouse management that helps track containers from different sources (CDC, Dammam Port, Jeddah Port, Local PO) and categorize them by type (mattress, sofa, dining, furniture).

## ✨ Features

- **Centralized Container Management**: Track all containers in one system
- **Multi-Source Tracking**: Support for CDC, Dammam Port, Jeddah Port, and Local PO
- **Container Categorization**: Organize by mattress, sofa, dining, and furniture types
- **User Management**: Role-based access control (Admin, Manager, User)
- **Real-time Updates**: Track container status changes and history
- **Comprehensive Reporting**: Statistics and analytics dashboard
- **Responsive Design**: Works on desktop and mobile devices
- **Audit Trail**: Complete history of all container changes

## 🏗️ System Architecture

- **Backend**: Node.js + Express.js + SQLite
- **Frontend**: React.js + Tailwind CSS
- **Database**: SQLite with proper relationships
- **Authentication**: JWT-based authentication system
- **API**: RESTful API with validation

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd warehouse-container-tracker
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Initialize the database**
   ```bash
   cd server
   npm run init-db
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

This will start both the backend server (port 5000) and frontend client (port 3000).

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Default Admin Credentials**:
  - Username: `admin`
  - Password: `admin123`

## 📊 Database Schema

### Tables

1. **users** - User accounts and roles
2. **container_types** - Container categories (mattress, sofa, dining, furniture)
3. **containers** - Main container information
4. **container_history** - Audit trail for all changes

### Key Fields

- Container Number (unique identifier)
- Container Type (mattress, sofa, dining, furniture)
- Source (CDC, Dammam Port, Jeddah Port, Local PO)
- Status (planned, in_transit, arrived, departed)
- Dates (planned, expected arrival, actual arrival, departure)
- User tracking (created_by, updated_by)

## 🔐 User Roles

- **Admin**: Full access to all features including user management
- **Manager**: Can manage containers and view reports
- **User**: Can view containers and update basic information

## 📱 Features Overview

### Dashboard
- Overview statistics
- Quick actions
- Recent containers
- Status breakdown

### Container Management
- Add new containers
- Update container status
- Track arrival/departure dates
- View container history
- Filter and search containers

### Statistics & Reports
- Container status breakdown
- Source distribution
- Type distribution
- Upcoming containers count

### User Management (Admin Only)
- Create/update users
- Manage user roles
- View user activity

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change password

### Containers
- `GET /api/containers` - List containers with filters
- `POST /api/containers` - Create new container
- `PUT /api/containers/:id` - Update container
- `DELETE /api/containers/:id` - Delete container
- `GET /api/containers/stats/overview` - Get statistics

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Database Configuration

The system uses SQLite by default. The database file is created automatically at `server/database.sqlite`.

## 📦 Production Deployment

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-production-secret-key
   ```

3. **Start the production server**
   ```bash
   cd server
   npm start
   ```

## 🧪 Testing

```bash
# Test the backend
cd server
npm test

# Test the frontend
cd client
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates & Maintenance

- Regular database backups
- Monitor system performance
- Update dependencies regularly
- Review and update user permissions

---

**Built with ❤️ for efficient warehouse management**