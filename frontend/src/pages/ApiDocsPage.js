import React from 'react';
import { Container, Typography, Paper, Box, Divider } from '@mui/material';

const CodeBlock = ({ children }) => (
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.900', color: 'white', fontFamily: 'monospace', mt: 1, mb: 2, whiteSpace: 'pre-wrap' }}>
        <code>{children}</code>
    </Paper>
);

const ApiDocsPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          API Documentation
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Welcome to the API documentation. Here you'll find everything you need to integrate your application with our WhatsApp Gateway.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>Authentication</Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          All API requests must be authenticated using an API key. You can generate your API key from your user dashboard. The API key must be included in the `X-API-KEY` header of every request.
        </Typography>
        <CodeBlock>
          {'POST /api/v1/message/send\n' +
           'Host: your-base-url.com\n' +
           'Content-Type: application/json\n' +
           'X-API-KEY: YOUR_GENERATED_API_KEY'}
        </CodeBlock>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>Endpoints</Typography>

        {/* Send Message Endpoint */}
        <Typography variant="h6" gutterBottom>Send a Text Message</Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Sends a single text message to a specified WhatsApp number.
        </Typography>
        <Typography variant="body2"><strong>POST</strong> `/api/v1/message/send`</Typography>
        <Typography variant="body1" sx={{ mt: 2, mb: 1 }}><strong>Body Parameters:</strong></Typography>
        <CodeBlock>
          {`{\n` +
           `  "deviceId": "YOUR_DEVICE_ID",\n` +
           `  "number": "6281234567890",\n` +
           `  "message": "Hello from the API!"\n` +
           `}`}
        </CodeBlock>

      </Box>
    </Container>
  );
};

export default ApiDocsPage;
