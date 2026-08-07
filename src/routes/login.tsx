import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const goNext = () => {
    if (next) window.location.href = next;
    else navigate({ to: "/" });
  };
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (next) window.location.href = next;
        else navigate({ to: "/" });
      }
    });
  }, [navigate, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goNext();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: next ? window.location.origin + next : window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Conta criada. Já pode iniciar sessão.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">PRISM Management</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Inicie sessão para continuar" : "Criar nova conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
            >
              {mode === "signin" ? "Criar nova conta" : "Já tenho conta"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
