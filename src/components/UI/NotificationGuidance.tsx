import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * デバイスがiOSかどうか判定
 */
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * PWAとして追加されているか判定
 */
function isPWAInstalled(): boolean {
  return window.navigator.standalone ||
         window.matchMedia('(display-mode: standalone)').matches;
}

export interface NotificationGuidanceProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 通知設定ガイダンスコンポーネント
 */
export const NotificationGuidance: React.FC<NotificationGuidanceProps> = ({
  visible,
  onClose,
}) => {
  const { state, actions } = useNotifications();
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsIOS(isIOSDevice());
      setIsPWA(isPWAInstalled());
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await actions.requestPermission();
    if (granted) {
      onClose();
    }
  };

  const renderIOSGuidance = () => (
    <View style={styles.guidanceContainer}>
      <Ionicons name="phone-portrait-outline" size={48} color="#007AFF" />
      <Text style={styles.title}>iOSデバイスでの通知設定</Text>

      {!isPWA ? (
        <View>
          <Text style={styles.subtitle}>
            ⚠️ iOSでは、Webアプリをホーム画面に追加した場合のみ通知が利用可能です
          </Text>

          <View style={styles.stepsContainer}>
            <Text style={styles.stepsTitle}>📱 設定手順：</Text>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Safari で「共有」ボタン（
                <Ionicons name="share-outline" size={16} color="#007AFF" />
                ）をタップ
              </Text>
            </View>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                「ホーム画面に追加」を選択
              </Text>
            </View>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                ホーム画面から Train Arrival Notifier を開く
              </Text>
            </View>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>
                通知権限をリクエストして許可する
              </Text>
            </View>
          </View>

          <View style={styles.noteContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#FF9500" />
            <Text style={styles.noteText}>
              Chrome や他のブラウザでは通知機能は制限されています。
              Safari をご利用ください。
            </Text>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.subtitle}>
            ✅ ホーム画面に追加済みです！通知権限を設定しましょう
          </Text>

          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <Text style={styles.permissionButtonText}>
              通知権限を許可
            </Text>
          </TouchableOpacity>

          {state.permissionStatus === 'denied' && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={20} color="#FF3B30" />
              <Text style={styles.warningText}>
                通知がブロックされています。
                Safariの設定から通知を許可してください。
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderGeneralGuidance = () => (
    <View style={styles.guidanceContainer}>
      <Ionicons name="notifications-outline" size={48} color="#007AFF" />
      <Text style={styles.title}>通知設定</Text>

      <Text style={styles.subtitle}>
        電車の到着情報や駅接近アラートを受け取るために、
        通知権限を許可してください
      </Text>

      <TouchableOpacity
        style={styles.permissionButton}
        onPress={handleRequestPermission}
      >
        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        <Text style={styles.permissionButtonText}>
          通知権限を許可
        </Text>
      </TouchableOpacity>

      {state.error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>
            {state.error}
          </Text>
        </View>
      )}

      {state.message && (
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            {state.message}
          </Text>
          {state.suggestion && (
            <Text style={styles.suggestionText}>
              💡 {state.suggestion}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>通知設定</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {Platform.OS === 'web' && isIOS ? renderIOSGuidance() : renderGeneralGuidance()}

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>📋 通知機能：</Text>

            <View style={styles.feature}>
              <Ionicons name="train-outline" size={20} color="#34C759" />
              <Text style={styles.featureText}>電車到着アラート</Text>
            </View>

            <View style={styles.feature}>
              <Ionicons name="location-outline" size={20} color="#34C759" />
              <Text style={styles.featureText}>駅接近通知</Text>
            </View>

            <View style={styles.feature}>
              <Ionicons name="time-outline" size={20} color="#34C759" />
              <Text style={styles.featureText}>時刻表リマインダー</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  guidanceContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6D6D80',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  stepsContainer: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
    minWidth: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8D7DA',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#721C24',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8D7DA',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#721C24',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: '#D1ECF1',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#0C5460',
    marginLeft: 24,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    color: '#0C5460',
    fontWeight: '600',
    marginLeft: 24,
  },
  featuresContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 12,
  },
});