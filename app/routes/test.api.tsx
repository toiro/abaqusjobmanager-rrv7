import type { MetaFunction } from "react-router";
import { useState } from "react";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, Select } from "~/components/ui";
import { TestLayout } from "~/components/layout/TestLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "API Test - Abaqus Job Manager" },
    { name: "description", content: "Testing API endpoints and responses" },
  ];
};

export default function TestAPI() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("");
  const [requestMethod, setRequestMethod] = useState("GET");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const apiEndpoints = [
    { value: "/api/jobs", label: "Jobs API", method: "GET" },
    { value: "/api/users", label: "Users API", method: "GET" },
    { value: "/api/nodes", label: "Nodes API", method: "GET" },
    { value: "/api/files", label: "Files API", method: "GET" },
    { value: "/api/test-events", label: "Test Events API", method: "POST" },
  ];

  const handleSendRequest = async () => {
    if (!selectedEndpoint) return;

    setIsLoading(true);
    try {
      const options: RequestInit = {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (requestMethod !== 'GET' && requestBody) {
        options.body = requestBody;
      }

      const apiResponse = await fetch(selectedEndpoint, options);
      const data = await apiResponse.json();
      
      setResponse(JSON.stringify({
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: Object.fromEntries(apiResponse.headers.entries()),
        data: data
      }, null, 2));
    } catch (error) {
      setResponse(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TestLayout 
      title="API Testing"
      description="Test API endpoints, requests, and responses"
    >
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>API Request Builder</CardTitle>
            <CardDescription>Build and send API requests to test endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="endpoint">API Endpoint</Label>
                <Select 
                  id="endpoint"
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                >
                  <option value="">Select an endpoint</option>
                  {apiEndpoints.map((endpoint) => (
                    <option key={endpoint.value} value={endpoint.value}>
                      {endpoint.label} ({endpoint.method})
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Label htmlFor="method">HTTP Method</Label>
                <Select 
                  id="method"
                  value={requestMethod}
                  onChange={(e) => setRequestMethod(e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </Select>
              </div>
            </div>

            {requestMethod !== 'GET' && (
              <div>
                <Label htmlFor="body">Request Body (JSON)</Label>
                <textarea
                  id="body"
                  className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"key": "value"}'
                />
              </div>
            )}

            <Button 
              onClick={handleSendRequest}
              disabled={!selectedEndpoint || isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending Request...' : 'Send Request'}
            </Button>
          </CardContent>
        </Card>

        {response && (
          <Card>
            <CardHeader>
              <CardTitle>API Response</CardTitle>
              <CardDescription>Response from the API endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
                {response}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Available Endpoints</CardTitle>
            <CardDescription>List of available API endpoints for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {apiEndpoints.map((endpoint) => (
                <div key={endpoint.value} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {endpoint.method} {endpoint.value}
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">{endpoint.label}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedEndpoint(endpoint.value);
                      setRequestMethod(endpoint.method);
                    }}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testing Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <h4 className="font-semibold">How to use this API tester:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Select an endpoint from the dropdown or click "Select" next to an endpoint below</li>
                <li>Choose the appropriate HTTP method</li>
                <li>For POST/PUT requests, provide JSON request body if needed</li>
                <li>Click "Send Request" to execute the API call</li>
                <li>Review the response including status, headers, and data</li>
              </ul>
              
              <h4 className="font-semibold mt-4">Sample Request Bodies:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                <p><strong>Test Events:</strong></p>
                <pre>{"{"}"eventType": "license_usage_updated", "data": {"{"}"totalTokens": 50, "usedTokens": 25, "availableTokens": 25{"}"}{"}"}{"}"}</pre>
                
                <p className="mt-2"><strong>Job Creation:</strong></p>
                <pre>{"{"}"name": "Test Job", "cpu_cores": 4, "priority": "normal"{"}"}</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TestLayout>
  );
}