"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Save, Database, Mail, Bot, Server } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LocalScriptRunner } from "@/components/local-script-runner"

type Config = {
  imap: {
    server: string
    port: number
    username: string
    password: string
    folder: string
  }
  xampp_mysql: {
    host: string
    user: string
    password: string
    database: string
    port: number
  }
  crm: {
    base_url: string
    username: string
    password: string
    import_endpoint: string
  }
  model_path: string
  csv_path: string
  temp_dir: string
  db_path: string
}

export function ConfigPanel() {
  const [config, setConfig] = useState<Config>({
    imap: {
      server: "localhost",
      port: 993,
      username: "",
      password: "",
      folder: "INBOX",
    },
    xampp_mysql: {
      host: "localhost",
      user: "root",
      password: "",
      database: "work_orders",
      port: 3306,
    },
    crm: {
      base_url: "http://localhost/espocrm",
      username: "",
      password: "",
      import_endpoint: "/api/v1/Import",
    },
    model_path: "meta-llama/Llama-3.2-1B",
    csv_path: "/var/data/work_orders.csv",
    temp_dir: "/tmp/email_attachments",
    db_path: "/var/data/processing_logs.db",
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")

  const fetchConfig = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/config")

      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.statusText}`)
      }

      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error("Error fetching configuration:", error)
      setError("Failed to load configuration. The Python service might not be running.")
      // The API route now returns default config on error, so we don't need to set it here
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaveStatus("saving")

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === "error") {
        setSaveStatus("error")
        setError(data.message)
      } else {
        setSaveStatus("success")
      }

      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      console.error("Error saving configuration:", error)
      setSaveStatus("error")
      setError(`Failed to save configuration: ${error.message || "Unknown error"}`)
      setTimeout(() => setSaveStatus("idle"), 3000)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleChange = (section: keyof Config, key: string, value: any) => {
    if (section === "xampp_mysql" || section === "crm" || section === "imap") {
      setConfig({
        ...config,
        [section]: {
          ...config[section],
          [key]: value,
        },
      })
    } else {
      setConfig({
        ...config,
        [key]: value,
      })
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Configuration</h2>
        <Button onClick={saveConfig} disabled={loading || saveStatus === "saving"}>
          <Save className="h-4 w-4 mr-2" />
          {saveStatus === "saving" ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveStatus === "success" && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Success</AlertTitle>
          <AlertDescription className="text-green-700">Configuration saved successfully.</AlertDescription>
        </Alert>
      )}

      {saveStatus === "error" && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to save configuration. The Python service might not be running.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="local">
            <Server className="h-4 w-4 mr-2" />
            Local Script
          </TabsTrigger>
          <TabsTrigger value="imap">
            <Mail className="h-4 w-4 mr-2" />
            IMAP
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger value="crm">
            <Mail className="h-4 w-4 mr-2" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Bot className="h-4 w-4 mr-2" />
            AI Model
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local">
          <LocalScriptRunner />
        </TabsContent>

        <TabsContent value="imap">
          <Card>
            <CardHeader>
              <CardTitle>IMAP Configuration</CardTitle>
              <CardDescription>Configure the IMAP server for email fetching</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imap-server">Server</Label>
                  <Input
                    id="imap-server"
                    value={config.imap.server}
                    onChange={(e) => handleChange("imap", "server", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-port">Port</Label>
                  <Input
                    id="imap-port"
                    type="number"
                    value={config.imap.port}
                    onChange={(e) => handleChange("imap", "port", Number.parseInt(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imap-folder">Folder</Label>
                <Input
                  id="imap-folder"
                  value={config.imap.folder}
                  onChange={(e) => handleChange("imap", "folder", e.target.value)}
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">The mailbox folder to check for new emails (usually INBOX)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imap-user">Username</Label>
                  <Input
                    id="imap-user"
                    value={config.imap.username}
                    onChange={(e) => handleChange("imap", "username", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-pass">Password</Label>
                  <Input
                    id="imap-pass"
                    type="password"
                    value={config.imap.password}
                    onChange={(e) => handleChange("imap", "password", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>Configure the MySQL database connection for work orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-host">Host</Label>
                  <Input
                    id="db-host"
                    value={config.xampp_mysql.host}
                    onChange={(e) => handleChange("xampp_mysql", "host", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-port">Port</Label>
                  <Input
                    id="db-port"
                    type="number"
                    value={config.xampp_mysql.port}
                    onChange={(e) => handleChange("xampp_mysql", "port", Number.parseInt(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-name">Database Name</Label>
                <Input
                  id="db-name"
                  value={config.xampp_mysql.database}
                  onChange={(e) => handleChange("xampp_mysql", "database", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-user">Username</Label>
                  <Input
                    id="db-user"
                    value={config.xampp_mysql.user}
                    onChange={(e) => handleChange("xampp_mysql", "user", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-pass">Password</Label>
                  <Input
                    id="db-pass"
                    type="password"
                    value={config.xampp_mysql.password}
                    onChange={(e) => handleChange("xampp_mysql", "password", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm">
          <Card>
            <CardHeader>
              <CardTitle>CRM Configuration</CardTitle>
              <CardDescription>Configure the EspoCRM connection settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="crm-url">Base URL</Label>
                <Input
                  id="crm-url"
                  value={config.crm.base_url}
                  onChange={(e) => handleChange("crm", "base_url", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crm-user">Username</Label>
                  <Input
                    id="crm-user"
                    value={config.crm.username}
                    onChange={(e) => handleChange("crm", "username", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crm-pass">Password</Label>
                  <Input
                    id="crm-pass"
                    type="password"
                    value={config.crm.password}
                    onChange={(e) => handleChange("crm", "password", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crm-endpoint">Import Endpoint</Label>
                <Input
                  id="crm-endpoint"
                  value={config.crm.import_endpoint}
                  onChange={(e) => handleChange("crm", "import_endpoint", e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Configuration</CardTitle>
              <CardDescription>Configure the AI model and file paths</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-path">Model Path</Label>
                <Input
                  id="model-path"
                  value={config.model_path}
                  onChange={(e) => handleChange("", "model_path", e.target.value)}
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">Path to the LLaMA model used for parsing emails</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv-path">CSV Path</Label>
                <Input
                  id="csv-path"
                  value={config.csv_path}
                  onChange={(e) => handleChange("", "csv_path", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temp-dir">Temporary Directory</Label>
                <Input
                  id="temp-dir"
                  value={config.temp_dir}
                  onChange={(e) => handleChange("", "temp_dir", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-path">Database Path</Label>
                <Input
                  id="db-path"
                  value={config.db_path}
                  onChange={(e) => handleChange("", "db_path", e.target.value)}
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">Path to the SQLite database used for logging</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

