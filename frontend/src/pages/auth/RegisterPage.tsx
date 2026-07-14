import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { authApi } from '@/api/auth'
const registerSchema = z
  .object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter uma letra maiúscula')
      .regex(/[a-z]/, 'Deve conter uma letra minúscula')
      .regex(/\d/, 'Deve conter um número'),
    confirmPassword: z.string().min(1, 'Confirmação é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

type RegisterData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      await registerUser(data)
      toast('success', 'Conta criada com sucesso!')
      navigate('/app')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message: string } } }).response?.data
              ?.message
          : 'Erro ao criar conta'
      toast('error', 'Erro ao cadastrar', msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-3xl">TD</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            TMAD Detail
          </h2>
          <p className="text-white/60 text-lg">
            Gerencie seus agendamentos, ordens de serviço e muito mais em um
            só lugar
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">TD</span>
            </div>
            <h1 className="text-2xl font-bold text-text">Criar Conta</h1>
            <p className="text-text-secondary mt-1">
              Preencha os dados para se cadastrar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              placeholder="Seu nome"
              icon={<User className="h-4 w-4" />}
              error={errors.name?.message}
              {...register('name')}
            />

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
              placeholder="Mínimo 8 caracteres"
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

            <Input
              label="Confirmar senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              icon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar
            </Button>
          </form>

          <div className="mt-6"></div>

          <p className="text-center text-sm text-text-secondary mt-6">
            Já tem conta?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
