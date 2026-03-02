import { useState } from "react";
import { useCafeteria } from "@/contexts/CafeteriaContext";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Utensils } from "lucide-react";

export default function LoginPage() {
  const { setAuth } = useCafeteria();
  const [studentId, setStudentId] = useState("240042132");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(studentId, password);
      setAuth({ token: res.token, studentId, studentName: res.studentName });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-4 shadow-lg">
            <Utensils className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            IUT Smart Cafeteria
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in to order your favorite meals
          </p>
        </div>

        {/* Login card */}
        <div className="glass rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-sm font-medium">
                Student ID
              </Label>
              <Input
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 240042132"
                className="h-12 rounded-xl bg-muted/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 rounded-xl bg-muted/50"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <span className="animate-pulse-soft">Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Demo: <span className="font-mono text-foreground/70">240042132</span> / <span className="font-mono text-foreground/70">password123</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Or use any ID with password <span className="font-mono text-foreground/70">devsprint</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
