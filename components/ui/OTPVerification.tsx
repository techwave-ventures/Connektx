import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Alert,
} from 'react-native';
import { Mail, ArrowLeft, RotateCcw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';

interface OTPVerificationProps {
  email: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading?: boolean;
  isResending?: boolean;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onVerify,
  onResend,
  onBack,
  isLoading = false,
  isResending = false,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Reset timer when resending
    if (isResending) {
      setTimer(30);
      setCanResend(false);
    }
  }, [isResending]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all fields are filled
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      Keyboard.dismiss();
      onVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (canResend && !isResending) {
      setOtp(['', '', '', '', '', '']);
      setTimer(30);
      setCanResend(false);
      onResend();
      inputRefs.current[0]?.focus();
    }
  };

  const handleManualVerify = () => {
    const otpString = otp.join('');
    if (otpString.length === 6) {
      onVerify(otpString);
    } else {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit code.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <ArrowLeft size={24} color={Colors.dark.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Mail size={32} color={Colors.dark.primary} />
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to
        </Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.checkSpam}>
          Please check your email inbox and spam folder
        </Text>
      </View>

      <View style={styles.otpContainer}>
        <Text style={styles.otpLabel}>Enter verification code</Text>
        <View style={styles.otpInputContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              maxLength={1}
              keyboardType="numeric"
              autoFocus={index === 0}
              selectTextOnFocus
            />
          ))}
        </View>
      </View>

      <View style={styles.resendContainer}>
        {!canResend ? (
          <Text style={styles.timerText}>
            Resend code in {formatTime(timer)}
          </Text>
        ) : (
          <TouchableOpacity
            onPress={handleResend}
            disabled={isResending}
            style={styles.resendButton}
          >
            <RotateCcw 
              size={16} 
              color={isResending ? Colors.dark.subtext : Colors.dark.primary} 
            />
            <Text style={[
              styles.resendText,
              isResending && styles.resendTextDisabled
            ]}>
              {isResending ? 'Sending...' : 'Resend code'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Button
        title="Verify & Create Account"
        onPress={handleManualVerify}
        isLoading={isLoading}
        disabled={otp.join('').length !== 6}
        gradient
        style={styles.verifyButton}
      />

      <TouchableOpacity onPress={onBack} style={styles.changeEmailButton}>
        <Text style={styles.changeEmailText}>Change email address</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: Colors.dark.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkSpam: {
    fontSize: 14,
    color: Colors.dark.subtext,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
    backgroundColor: Colors.dark.card,
  },
  otpInputFilled: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.card,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resendText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  resendTextDisabled: {
    color: Colors.dark.subtext,
  },
  verifyButton: {
    marginBottom: 24,
  },
  changeEmailButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  changeEmailText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    textDecorationLine: 'underline',
  },
});

export default OTPVerification;