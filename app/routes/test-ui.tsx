import type { MetaFunction } from "react-router";
import { 
  Button, 
  Badge, 
  Input, 
  Label, 
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  SuccessMessage,
  ErrorMessage,
  WarningMessage,
  InfoMessage,
  Loading,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "~/components/ui";
import { MESSAGES } from "~/lib/messages";

export const meta: MetaFunction = () => {
  return [
    { title: "UI Components Test - Abaqus Job Manager" },
    { name: "description", content: "Testing UI components" },
  ];
};

export default function TestUI() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">UI Components Test</h1>
      
      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles and sizes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button>{MESSAGES.BUTTON.CREATE_JOB}</Button>
            <Button variant="secondary">{MESSAGES.BUTTON.CANCEL}</Button>
            <Button variant="destructive">{MESSAGES.BUTTON.DELETE}</Button>
            <Button variant="outline">{MESSAGES.BUTTON.EDIT}</Button>
            <Button variant="ghost">{MESSAGES.BUTTON.REFRESH}</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm">{MESSAGES.BUTTON.SAVE}</Button>
            <Button size="default">{MESSAGES.BUTTON.SAVE}</Button>
            <Button size="lg">{MESSAGES.BUTTON.SAVE}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Status badges for jobs and nodes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="success">{MESSAGES.JOB.STATUS.COMPLETED}</Badge>
            <Badge variant="running">{MESSAGES.JOB.STATUS.RUNNING}</Badge>
            <Badge variant="waiting">{MESSAGES.JOB.STATUS.WAITING}</Badge>
            <Badge variant="destructive">{MESSAGES.JOB.STATUS.FAILED}</Badge>
            <Badge variant="warning">{MESSAGES.NODE.STATUS.HIGH_LOAD}</Badge>
            <Badge variant="default">{MESSAGES.NODE.STATUS.AVAILABLE}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
          <CardDescription>Input fields and form controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="job-name">{MESSAGES.FORM.JOB_NAME}</Label>
              <Input id="job-name" placeholder="Enter job name" />
            </div>
            <div>
              <Label htmlFor="cpu-cores">{MESSAGES.FORM.CPU_CORES}</Label>
              <Select id="cpu-cores" placeholder="Select CPU cores">
                <option value="1">1 core</option>
                <option value="2">2 cores</option>
                <option value="4">4 cores</option>
                <option value="8">8 cores</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Success, error, warning, and info messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SuccessMessage 
            title="Success"
            message="Job created successfully! The system has processed your request." 
          />
          <ErrorMessage 
            title="Error"
            message="Upload failed. Please check your file format and try again." 
          />
          <WarningMessage 
            title="Warning"
            message="Insufficient CPU cores available on the selected node. Consider selecting another node." 
          />
          <InfoMessage 
            title="Information"
            message="Checking resource availability... This may take a few moments." 
          />
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
          <CardDescription>Loading spinners and indicators</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Loading size="sm" text="Small loading..." />
            <Loading size="md" text="Medium loading..." />
            <Loading size="lg" text="Large loading..." />
          </div>
          <div className="flex gap-4 items-center">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Table</CardTitle>
          <CardDescription>Sample job table layout</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{MESSAGES.TABLE.ID}</TableHead>
                <TableHead>{MESSAGES.TABLE.JOB_NAME}</TableHead>
                <TableHead>{MESSAGES.TABLE.STATUS}</TableHead>
                <TableHead>{MESSAGES.TABLE.USER}</TableHead>
                <TableHead>{MESSAGES.TABLE.CPU}</TableHead>
                <TableHead>{MESSAGES.TABLE.ACTIONS}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>1</TableCell>
                <TableCell>Test Job 1</TableCell>
                <TableCell>
                  <Badge variant="running">{MESSAGES.JOB.STATUS.RUNNING}</Badge>
                </TableCell>
                <TableCell>user1</TableCell>
                <TableCell>4</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">{MESSAGES.BUTTON.VIEW_DETAILS}</Button>
                    <Button size="sm" variant="destructive">{MESSAGES.BUTTON.CANCEL}</Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2</TableCell>
                <TableCell>Test Job 2</TableCell>
                <TableCell>
                  <Badge variant="success">{MESSAGES.JOB.STATUS.COMPLETED}</Badge>
                </TableCell>
                <TableCell>user2</TableCell>
                <TableCell>2</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">{MESSAGES.BUTTON.VIEW_DETAILS}</Button>
                    <Button size="sm" variant="outline">{MESSAGES.BUTTON.DOWNLOAD}</Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}