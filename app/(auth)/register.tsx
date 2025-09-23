import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Mail, Lock, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import OTPVerification from '@/components/ui/OTPVerification';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, sendEmailOTP, registerWithOTP, error } = useAuthStore();
  
  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    
    // Ensure all values are strings
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '').trim();
    const cleanConfirmPassword = String(confirmPassword || '').trim();
    
    if (cleanName.length === 0) {
      newErrors.name = 'Name is required';
    }
    
    if (cleanEmail.length === 0) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (cleanPassword.length === 0) {
      newErrors.password = 'Password is required';
    } else if (cleanPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (cleanConfirmPassword.length === 0) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (cleanPassword !== cleanConfirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (validateForm()) {
      try {
        const cleanEmail = String(email || '').trim();
        await sendEmailOTP(cleanEmail);
        // Success! Move to verification step
        Alert.alert(
          'Verification Code Sent', 
          `We've sent a 6-digit verification code to ${cleanEmail}. Please check your email (including spam folder) and enter the code on the next screen.`,
          [{ text: 'OK', onPress: () => setStep('verification') }]
        );
      } catch (error: any) {
        console.error('Registration error:', error);
        // Error is handled by the auth store and displayed through error state
      }
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    try {
      const cleanName = String(name || '').trim();
      const cleanEmail = String(email || '').trim();
      const cleanPassword = String(password || '').replace(/[\r\n\t]/g, '').trim();
      
      await registerWithOTP(cleanName, cleanEmail, cleanPassword, otp);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Registration error:', error);
      // Error is handled by the auth store and displayed through error state
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsResending(true);
      const cleanEmail = String(email || '').trim();
      await sendEmailOTP(cleanEmail);
    } catch (error) {
      console.error('Resend OTP error:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
  };


  const handleLogin = () => {
    router.push('/login');
  };

  // Show error alert if there's an error from the auth store
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  if (step === 'verification') {
    return (
      <LinearGradient
        colors={['#121212', '#1E1E1E']}
        style={styles.container}
      >
        <OTPVerification
          email={email}
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
          onBack={handleBackToForm}
          isLoading={isLoading}
          isResending={isResending}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#121212', '#1E1E1E']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to get started with ConnektX
            </Text>
          </View>
          
          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              leftIcon={<User size={20} color={Colors.dark.subtext} />}
              error={errors.name}
            />
            
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.dark.subtext} />}
              error={errors.email}
            />
            
            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={<Lock size={20} color={Colors.dark.subtext} />}
              error={errors.password}
            />
            
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              leftIcon={<Lock size={20} color={Colors.dark.subtext} />}
              error={errors.confirmPassword}
            />
            
            <Button
              title="Send Verification Code"
              onPress={handleRegister}
              isLoading={isLoading}
              gradient
              rightIcon={<ArrowRight size={20} color="#fff" />}
              style={styles.registerButton}
            />
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.loginText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  registerButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.dark.subtext,
    marginRight: 4,
  },
  loginText: {
    color: Colors.dark.tint,
    fontWeight: '600',
  },
});