# AI Assistant Chatbot

This project is a simple chat application that interacts with the OpenAI API using a server-side secret. The web page lets you send messages to the assistant.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Provide your OpenAI API key via the `OPENAI_API_KEY` environment variable.
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in your browser.

## Testing

Run unit and integration tests with:
```bash
npm test
```

## Code Editing

You can replace files in the project by sending a chat message that begins with
`CODE:` followed by the relative file path and the new contents separated by a
newline:

```
CODE:path/to/file.js
<new file contents>
```

Only paths that resolve inside the project directory are allowed. Be careful
exposing this feature as it can overwrite important files. Grant access only to
trusted users.
