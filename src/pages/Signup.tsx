import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from '../components/ui/field'
import polyBg from '../assets/img/poly.png'
import logo from '../assets/img/logo-full.png'

interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  phoneNumber: string
  katyNumber: string
  grade: string
  parentEmail: string
  parentPhone: string
  address: string
}

export function Signup() {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    katyNumber: '',
    grade: '',
    parentEmail: '',
    parentPhone: '',
    address: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await signup(formData.email, formData.password, {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        katyNumber: formData.katyNumber,
        grade: formData.grade,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone,
        address: formData.address,
      })

      navigate('/login')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `url(${polyBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-h-screen overflow-y-auto py-30 px-4">
        <Card className='max-w-lg mx-auto'>
          <CardHeader className="space-y-2 text-center">
            <img src={logo} alt="Cryptonite Robotics" className="mx-auto h-35" />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {/* Account Info */}
              <FieldGroup className='gap-4'>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </Field>
              </FieldGroup>

              <FieldSeparator className="my-4" />

              {/* Personal Info */}
              <FieldGroup className='gap-4'>
                <Field>
                  <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="phoneNumber">Phone Number</FieldLabel>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="katyNumber">Katy Number</FieldLabel>
                  <Input
                    id="katyNumber"
                    name="katyNumber"
                    type="text"
                    value={formData.katyNumber}
                    onChange={handleChange}
                    placeholder="k1234567"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="grade">Grade</FieldLabel>
                  <Input
                    id="grade"
                    name="grade"
                    type="number"
                    value={formData.grade}
                    onChange={handleChange}
                    placeholder="9"
                    min="1"
                    max="12"
                  />
                </Field>
              </FieldGroup>

              <FieldSeparator className="my-4" />

              {/* Parent/Guardian Info */}
              <FieldGroup className='gap-4'>
                <Field>
                  <FieldLabel htmlFor="parentEmail">Parent/Guardian Email</FieldLabel>
                  <Input
                    id="parentEmail"
                    name="parentEmail"
                    type="email"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    placeholder="parent@email.com"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="parentPhone">Parent/Guardian Phone</FieldLabel>
                  <Input
                    id="parentPhone"
                    name="parentPhone"
                    type="tel"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    placeholder="(555) 987-6543"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="address">Address</FieldLabel>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </Field>
              </FieldGroup>

              {error && (
                <div className="mt-4 p-3 bg-destructive/20 border border-destructive rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
