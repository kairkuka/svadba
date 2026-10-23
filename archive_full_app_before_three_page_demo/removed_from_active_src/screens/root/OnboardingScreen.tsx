import type { LucideIcon } from 'lucide-react-native';
import {
  ArrowLeft,
  BriefcaseBusiness,
  LogIn,
  MapPin,
  RefreshCw,
  Smartphone,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { requestAuthCode, verifyAuthCode } from '../api/auth';
import { ActionButton, GhostButton } from '../components/Buttons';
import { colors, styles } from '../theme/styles';
import type { Role, UserSession } from '../types';

const cities = ['Алматы', 'Астана', 'Шымкент'];

export function OnboardingScreen({
  onComplete,
}: {
  onComplete: (session: UserSession) => void;
}) {
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [role, setRole] = useState<Role>('client');
  const [city, setCity] = useState('Алматы');
  const [name, setName] = useState('Алия');
  const [phone, setPhone] = useState('+7 700 123 45 67');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestCode = async () => {
    const normalizedPhone = normalizePhone(phone);

    if (name.trim().length < 2) {
      setError('Укажите имя или название компании.');
      return;
    }

    if (!isValidPhone(normalizedPhone)) {
      setError('Введите номер телефона полностью.');
      return;
    }

    if (!consentAccepted) {
      setError('Подтвердите согласие на обработку данных.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await requestAuthCode({ phone: normalizedPhone });
      setRequestId(response.requestId);
      setCode(response.autofillCode ?? '');
      setStep('code');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось отправить код.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 4) {
      setError('Введите четыре цифры из сообщения.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await verifyAuthCode({
        requestId,
        code,
        phone: normalizedPhone,
        role,
        city,
        name: name.trim(),
      });

      onComplete({
        role,
        city,
        name: name.trim(),
        phone: normalizedPhone,
        accessToken: response.accessToken,
      });
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, 'Не удалось подтвердить код.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.onboardingContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.onboardingHero}>
        <Text style={styles.eyebrow}>Svadba mobile</Text>
        <Text style={styles.heroTitle}>
          {step === 'details'
            ? 'Планирование свадьбы начинается с телефона'
            : 'Подтвердите номер телефона'}
        </Text>
        <Text style={styles.heroText}>
          {step === 'details'
            ? 'Найдите подрядчиков, отправьте заявку, забронируйте дату и ведите переписку в одном приложении.'
            : `Код отправлен на ${phone}. Обычно сообщение приходит в течение минуты.`}
        </Text>
      </View>

      {step === 'details' ? (
        <DetailsStep
          role={role}
          city={city}
          name={name}
          phone={phone}
          consentAccepted={consentAccepted}
          error={error}
          isSubmitting={isSubmitting}
          onRoleChange={(nextRole) => {
            setRole(nextRole);
            setName(nextRole === 'client' ? 'Алия' : 'Aigerim Decor Studio');
            setError('');
          }}
          onCityChange={setCity}
          onNameChange={(value) => {
            setName(value);
            setError('');
          }}
          onPhoneChange={(value) => {
            setPhone(formatPhone(value));
            setError('');
          }}
          onConsentChange={() => {
            setConsentAccepted((current) => !current);
            setError('');
          }}
          onSubmit={handleRequestCode}
        />
      ) : (
        <CodeStep
          code={code}
          error={error}
          isSubmitting={isSubmitting}
          onCodeChange={(value) => {
            setCode(value.replace(/\D/g, '').slice(0, 4));
            setError('');
          }}
          onBack={() => {
            setStep('details');
            setCode('');
            setError('');
          }}
          onResend={handleRequestCode}
          onSubmit={handleVerifyCode}
        />
      )}
    </ScrollView>
  );
}

function DetailsStep({
  role,
  city,
  name,
  phone,
  consentAccepted,
  error,
  isSubmitting,
  onRoleChange,
  onCityChange,
  onNameChange,
  onPhoneChange,
  onConsentChange,
  onSubmit,
}: {
  role: Role;
  city: string;
  name: string;
  phone: string;
  consentAccepted: boolean;
  error: string;
  isSubmitting: boolean;
  onRoleChange: (role: Role) => void;
  onCityChange: (city: string) => void;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onConsentChange: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Кем вы заходите?</Text>
        <View style={styles.buttonRow}>
          <RoleChoice
            label="Клиент"
            icon={UserRound}
            active={role === 'client'}
            onPress={() => onRoleChange('client')}
          />
          <RoleChoice
            label="Подрядчик"
            icon={BriefcaseBusiness}
            active={role === 'vendor'}
            onPress={() => onRoleChange('vendor')}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ваш город</Text>
        <View style={styles.buttonRow}>
          {cities.map((item) => (
            <RoleChoice
              key={item}
              label={item}
              icon={MapPin}
              active={city === item}
              onPress={() => onCityChange(item)}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Имя или компания</Text>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          placeholder="Как к вам обращаться"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
        <Text style={styles.fieldLabel}>Номер телефона</Text>
        <TextInput
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder="+7 700 000 00 00"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consentAccepted }}
        onPress={onConsentChange}
        style={({ pressed }) => [styles.consentRow, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.checkbox,
            consentAccepted && styles.checkboxSelected,
          ]}
        >
          {consentAccepted ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.consentText}>
          Я принимаю условия сервиса и согласен на обработку персональных данных.
        </Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ActionButton
        label={isSubmitting ? 'Отправляем код...' : 'Получить код'}
        disabled={isSubmitting}
        icon={Smartphone}
        onPress={onSubmit}
      />
    </>
  );
}

function CodeStep({
  code,
  error,
  isSubmitting,
  onCodeChange,
  onBack,
  onResend,
  onSubmit,
}: {
  code: string;
  error: string;
  isSubmitting: boolean;
  onCodeChange: (code: string) => void;
  onBack: () => void;
  onResend: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <ArrowLeft color={colors.teal} size={18} strokeWidth={2.5} />
        <Text style={styles.backButtonText}>Изменить номер</Text>
      </Pressable>
      <Text style={styles.cardTitle}>Код из SMS</Text>
      <TextInput
        value={code}
        onChangeText={onCodeChange}
        autoFocus
        keyboardType="number-pad"
        maxLength={4}
        textContentType="oneTimeCode"
        placeholder="0000"
        placeholderTextColor={colors.muted}
        style={[styles.searchInput, styles.codeInput]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <ActionButton
        label={isSubmitting ? 'Проверяем...' : 'Подтвердить и войти'}
        disabled={isSubmitting}
        icon={LogIn}
        onPress={onSubmit}
      />
      <GhostButton
        label="Отправить код повторно"
        disabled={isSubmitting}
        icon={RefreshCw}
        onPress={onResend}
      />
    </View>
  );
}

function RoleChoice({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onPress: () => void;
}) {
  return active ? (
    <ActionButton label={label} icon={icon} onPress={onPress} />
  ) : (
    <GhostButton label={label} icon={icon} onPress={onPress} />
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const localDigits = (
    digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits
  ).slice(0, 10);
  const parts = [
    localDigits.slice(0, 3),
    localDigits.slice(3, 6),
    localDigits.slice(6, 8),
    localDigits.slice(8, 10),
  ].filter(Boolean);

  return ['+7', ...parts].join(' ');
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const localDigits =
    digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;

  return `+7${localDigits.slice(0, 10)}`;
}

function isValidPhone(phone: string) {
  return /^\+7\d{10}$/.test(phone);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
