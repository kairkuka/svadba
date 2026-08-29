import { ArrowLeft, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { GhostButton } from '../components/Buttons';
import { chatMessages } from '../data/mock';
import { colors, styles } from '../theme/styles';
import type { ChatMessage, Lead, Role, UserSession } from '../types';

export function ChatScreen({
  lead,
  role,
  session,
  onBack,
}: {
  lead: Lead;
  role: Role;
  session: UserSession;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    chatMessages.filter((message) => message.leadId === lead.id),
  );
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0;

  const sendMessage = () => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `local-message-${Date.now()}`,
        leadId: lead.id,
        authorRole: role,
        authorName: session.name,
        text,
        createdAt: 'Только что',
        status: 'Отправлено',
      },
    ]);
    setDraft('');
  };

  return (
    <View style={styles.screenStack}>
      <GhostButton label="Назад к заявке" icon={ArrowLeft} onPress={onBack} />

      <View>
        <Text style={styles.screenTitle}>Чат по заявке</Text>
        <Text style={styles.screenSubtitle}>
          {role === 'client' ? lead.vendor : lead.client} · {lead.date}
        </Text>
      </View>

      <View style={styles.chatSummaryCard}>
        <Text style={styles.cardTitle}>{lead.title}</Text>
        <Text style={styles.cardText}>
          {lead.guests} гостей · {lead.budget} · {lead.status}
        </Text>
      </View>

      <View style={styles.chatPreview}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Сообщений пока нет</Text>
            <Text style={styles.cardText}>
              Напишите первое сообщение, чтобы начать обсуждение заявки.
            </Text>
          </View>
        ) : (
          messages.map((message) => {
            const own = message.authorRole === role;

            return (
              <View
                key={message.id}
                style={own ? styles.chatBubbleOutboundWrap : styles.chatBubbleInboundWrap}
              >
                <Text
                  style={own ? styles.chatBubbleOutbound : styles.chatBubbleInbound}
                >
                  {message.text}
                </Text>
                <Text style={styles.mutedSmall}>
                  {message.authorName} · {message.createdAt} · {message.status}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.chatComposer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="Напишите сообщение"
          placeholderTextColor={colors.muted}
          style={styles.chatInput}
        />
        <Pressable
          accessibilityLabel="Отправить сообщение"
          accessibilityRole="button"
          disabled={!canSend}
          onPress={sendMessage}
          style={({ pressed }) => [
            styles.chatSendButton,
            !canSend && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Send color={colors.surface} size={20} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}
