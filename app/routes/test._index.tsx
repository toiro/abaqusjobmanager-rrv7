import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TestLayout } from "~/components/layout/TestLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Test Environment - Abaqus Job Manager" },
    { name: "description", content: "Development testing environment" },
  ];
};

const testCategories = [
  {
    title: "UI Components",
    description: "Test all UI components, styling, and design system elements",
    href: "/test/ui",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v6a2 2 0 002 2h4a2 2 0 002-2V5zM21 15a2 2 0 00-2-2h-4a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2v-2z" />
      </svg>
    ),
    features: [
      "Buttons, badges, and form elements",
      "Loading states and messages",
      "Table layouts and data display",
      "SystemStatusBar integration"
    ]
  },
  {
    title: "SSE Testing",
    description: "Test Server-Sent Events functionality and real-time updates",
    href: "/test/sse",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    features: [
      "Real-time license updates",
      "Job status change events",
      "Connection status monitoring",
      "Keep-alive ping testing"
    ]
  },
  {
    title: "API Testing",
    description: "Test API endpoints, requests, and responses",
    href: "/test/api",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    features: [
      "REST API endpoint testing",
      "Request/response validation",
      "HTTP method testing",
      "JSON payload validation"
    ]
  }
];

export default function TestIndex() {
  return (
    <TestLayout 
      title="Test Environment"
      description="Development testing environment for UI components, SSE functionality, and API endpoints"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testCategories.map((category) => (
          <Card key={category.href} className="relative group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="text-primary">
                  {category.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="mt-2">
                {category.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {category.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <svg 
                      className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link to={category.href}>
                <Button className="w-full group-hover:bg-primary/90 transition-colors">
                  Open {category.title}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Development Information</CardTitle>
            <CardDescription>Current development status and testing guidelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Completed Features ✅</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Hydration-safe SSE implementation</li>
                  <li>• Real-time SystemStatusBar</li>
                  <li>• Complete UI component library</li>
                  <li>• Job management interface</li>
                  <li>• Admin dashboard</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Testing Environment 🧪</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• UI component validation</li>
                  <li>• SSE event simulation</li>
                  <li>• API endpoint testing</li>
                  <li>• Real-time functionality verification</li>
                  <li>• Browser compatibility testing</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This test environment is for development purposes only. 
                All test data and events are simulated and do not affect the production system.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TestLayout>
  );
}