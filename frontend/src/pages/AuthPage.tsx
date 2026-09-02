import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  GitBranch,
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Users,
  GitBranch as BranchIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/schemas/auth";
import { loginApi, registerApi, setAuthToken, getErrorMessage } from "@/lib/apis/api";

import "@/css/auth_theme.css";

export default function AuthPage() {
  const navigate = useNavigate();
  const initialMode = new URLSearchParams(window.location.search).get("mode") === "register"
    ? "register"
    : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("fastrepo_session_expired")) {
        sessionStorage.removeItem("fastrepo_session_expired")
        const msg = "Session timed out. Please sign in again."
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setErrorMessage(msg)
        toast.error(msg)
      }
    } catch (e) {
      void e
    }
  }, [])

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      profilePicture: undefined,
    },
  });

  const [preview, setPreview] = useState<string | null>(null);
  const profileFile = registerForm.watch("profilePicture");

  useEffect(() => {
    if (profileFile) {
      const url = URL.createObjectURL(profileFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [profileFile]);

  const onLoginSubmit = async (values: LoginInput) => {
    setErrorMessage(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", values.username);
      formData.append("password", values.password);

      const data = await loginApi(formData);
      setAuthToken(data.access_token);
      navigate("/");
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterInput) => {
    setErrorMessage(null);
    setLoading(true);

    try {
      await registerApi({
        username: values.username,
        email: values.email,
        password: values.password,
        profilePicture: values.profilePicture,
      });

      const formData = new FormData();
      formData.append("username", values.username);
      formData.append("password", values.password);

      const data = await loginApi(formData);
      setAuthToken(data.access_token);
      navigate("/");
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: "login" | "register") => {
    setErrorMessage(null);
    setMode(nextMode);
  };

  return (
    <main className="auth-shell">
      {/* Left reference-style hero */}
      <section className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <GitBranch className="h-5 w-5" />
            </div>
            <span>FastRepo</span>
          </div>

          <div className="auth-hero-copy">
            <h1 className="auth-hero-title">
              Code hosting with
              <br />
              permissions that match
              <br />
              your org chart.
            </h1>

          </div>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2>Per-folder permissions</h2>
                <p>
                  Grant write on /services/payments without opening the whole
                  repo.
                </p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2>Nested teams</h2>
                <p>
                  Engineering → Backend → Payments Squad. Rules cascade down
                  the tree.
                </p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <BranchIcon className="h-5 w-5" />
              </div>
              <div>
                <h2>Branch + path rules</h2>
                <p>
                  A team can own a folder and still be read-only on
                  release/1.0.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right authentication panel */}
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-form-header">
            <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p>
              {mode === "login"
                ? "Sign in to continue to FastRepo."
                : "Create an account to start using FastRepo."}
            </p>
          </div>

          {errorMessage && (
            <div className="auth-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === "login" ? (
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="auth-form"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="auth-label">Username</FormLabel>
                      <FormControl>
                        <div className="auth-input-wrap">
                          <User className="auth-input-icon h-4 w-4" />
                          <Input
                            placeholder="username"
                            className="auth-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="auth-label">Password</FormLabel>
                      <FormControl>
                        <div className="auth-input-wrap">
                          <Lock className="auth-input-icon h-4 w-4" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="auth-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="auth-form"
              >
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="auth-label">Username</FormLabel>
                      <FormControl>
                        <div className="auth-input-wrap">
                          <User className="auth-input-icon h-4 w-4" />
                          <Input
                            placeholder="your-username"
                            className="auth-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="auth-label">Email</FormLabel>
                      <FormControl>
                        <div className="auth-input-wrap">
                          <Mail className="auth-input-icon h-4 w-4" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className="auth-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="auth-label">Password</FormLabel>
                      <FormControl>
                        <div className="auth-input-wrap">
                          <Lock className="auth-input-icon h-4 w-4" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="auth-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="auth-label">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <div className="auth-input-wrap">
                          <Lock className="auth-input-icon h-4 w-4" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="auth-input"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="profilePicture"
                  render={({ field: { value: _v, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel className="auth-label">Profile picture (optional)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-foreground/10 bg-muted">
                            {preview ? (
                              <img src={preview} alt="preview" className="size-full object-cover" />
                            ) : (
                              <ImageIcon className="size-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              className="auth-input cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary-foreground"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                onChange(file);
                              }}
                              {...field}
                            />
                          </div>
                          {preview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0"
                              onClick={() => {
                                registerForm.setValue("profilePicture", undefined as unknown as File);
                                setPreview(null);
                              }}
                              aria-label="Remove picture"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          )}

          <div className="auth-switch">
            {mode === "login" ? (
              <>
                <span>Don't have an account?</span>
                <button type="button" onClick={() => switchMode("register")}>
                  Register
                </button>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <button type="button" onClick={() => switchMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="auth-lock-note">
            <Lock className="h-3.5 w-3.5" />
            <span>Secure authentication for your FastRepo account.</span>
          </div>
        </div>
      </section>
    </main>
  );
}