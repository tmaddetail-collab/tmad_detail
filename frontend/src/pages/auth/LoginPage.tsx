import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
      toast('success', 'Login realizado com sucesso!')
      navigate('/app')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message: string } } }).response?.data
              ?.message
          : 'Email ou senha inválidos'
      toast('error', 'Erro ao entrar', msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">TD</span>
            </div>
            <h1 className="text-2xl font-bold text-text">Bem-vindo</h1>
            <p className="text-text-secondary mt-1">
              Faça login para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              icon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-text-secondary hover:text-text transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary-dark transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </form>

          <div className="mt-6"></div>

          <p className="text-center text-sm text-text-secondary mt-6">
            Não tem conta?{' '}
            <Link
              to="/register"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-3xl">TD</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            TMAD Detail
          </h2>
          <p className="text-white/60 text-lg">
            Sistema completo de gerenciamento para sua oficina de detalhamento
            automotivo
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-xs text-white/50 mt-1">Clientes Atendidos</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="text-xs text-white/50 mt-1">Satisfação</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-white">4.9</p>
              <p className="text-xs text-white/50 mt-1">Avaliação</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
