# ChatConnect - Random Chat Platform

ChatConnect is a modern web application that allows users to chat with random strangers based on shared interests. This platform enables users to connect anonymously with people worldwide for meaningful conversations.

## Features

- **User Authentication**: Secure authentication system using Clerk
- **User Profiles**: Age verification (18+ only) and gender selection
- **Interest-Based Matching**: Users can select interests and get matched with people who share similar ones
- **Real-time Chat**: Instant messaging with strangers
- **Chat Room Management**: Skip conversations, view common interests, and more
- **Responsive Design**: Works on desktop and mobile devices

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Authentication**: Clerk Auth
- **Database**: Firebase Firestore (NoSQL database)
- **Real-time Features**: Firebase Realtime Database

## Getting Started

### Prerequisites

- Firebase account
- Clerk account
- Basic knowledge of HTML, CSS, and JavaScript

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chatconnect.git
   cd chatconnect
   ```

2. Set up Firebase:
   - Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore and Realtime Database
   - Get your Firebase configuration
   - Replace the placeholder config in the following files:
     - `js/app.js`
     - `js/chat.js`
     - `js/dashboard.js`

3. Set up Clerk:
   - Create a Clerk application in the [Clerk Dashboard](https://dashboard.clerk.dev/)
   - Get your Publishable Key
   - Replace `YOUR_CLERK_PUBLISHABLE_KEY` in `js/auth.js`

4. Serve the application:
   - You can use any local development server
   - For example, with Node.js and the `http-server` package:
     ```bash
     npm install -g http-server
     http-server
     ```

## Project Structure

```
chatconnect/
├── index.html          # Landing page
├── dashboard.html      # User dashboard
├── chat.html           # Chat interface
├── css/
│   └── style.css       # Main stylesheet
├── js/
│   ├── app.js          # Common application functions
│   ├── auth.js         # Authentication with Clerk
│   ├── dashboard.js    # Dashboard functionality
│   └── chat.js         # Chat functionality
└── README.md           # Project documentation
```

## Future Improvements

- Add games and activities users can play while chatting
- Implement premium features (gender filter, advanced matching)
- Add video chat capabilities
- Develop mobile applications
- Implement content moderation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Firebase](https://firebase.google.com/) for real-time database
- [Clerk](https://clerk.dev/) for authentication
- [Font Awesome](https://fontawesome.com/) for icons
- [DiceBear](https://www.dicebear.com/) for avatar generation #   P v P - c h a t  
 