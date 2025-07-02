import { RouteProp, useFocusEffect, useLocale, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import SeedWords from '../../components/SeedWords';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { QBTCWallet } from '../../class/wallets/qbtc-wallet';
import Clipboard from '@react-native-clipboard/clipboard';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { Icon } from '@rneui/themed';

type RouteProps = RouteProp<AddWalletStackParamList, 'PleaseBackup'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'PleaseBackup'>;

const PleaseBackup: React.FC = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const navigation = useNavigation<NavigationProp>();
  const { isPrivacyBlurEnabled } = useSettings();
  const { colors } = useTheme();
  const { direction } = useLocale();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    pleaseText: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
    keyInput: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      color: colors.foregroundColor,
    },
    copyButton: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  const handleBackButton = useCallback(() => {
    navigation.getParent()?.goBack();
    return true;
  }, [navigation]);

  const handleCopyKeys = useCallback(() => {
    const secret = wallet.getSecret();
    if (secret) {
      Clipboard.setString(secret);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    }
  }, [wallet]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      subscription.remove();
    };
  }, [handleBackButton]);

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [disableScreenProtect, enableScreenProtect, isPrivacyBlurEnabled]),
  );

  const isQBTCWallet = wallet instanceof QBTCWallet;
  const secret = wallet.getSecret() ?? '';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.flex, stylesHook.flex]}
      testID="PleaseBackupScrollView"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.please}>
        <Text style={[styles.pleaseText, stylesHook.pleaseText]}>
          {isQBTCWallet 
            ? 'Your qBTC wallet uses ML-DSA-87 (post-quantum cryptography). This algorithm does not allow recovering the public key from the private key alone, so both keys must be backed up securely. Store the following public:private key pair in a safe place.'
            : loc.pleasebackup.text}
        </Text>
      </View>
      <View style={styles.list}>
        {isQBTCWallet ? (
          <View style={styles.qbtcKeyContainer}>
            <Text style={[styles.labelText, stylesHook.pleaseText]}>qBTC Public and Private Keys:</Text>
            <View style={styles.keyInputContainer}>
              <TextInput
                style={[styles.keyInput, stylesHook.keyInput]}
                value={secret}
                editable={false}
                multiline
                numberOfLines={4}
                scrollEnabled
              />
              <TouchableOpacity 
                style={[styles.copyButton, stylesHook.copyButton]} 
                onPress={handleCopyKeys}
              >
                <Icon name="copy" type="font-awesome-5" color={colors.buttonTextColor} size={20} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.warningText, { color: colors.failedColor }]}>
              ⚠️ Warning: Keep this key pair extremely secure. Anyone with access to these keys can control your qBTC funds.
            </Text>
          </View>
        ) : (
          <SeedWords seed={secret} />
        )}
      </View>
      <View style={styles.bottom}>
        <Button testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-around',
  },
  please: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  list: {
    flexGrow: 8,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  bottom: {
    flexGrow: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qbtcKeyContainer: {
    flex: 1,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  keyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  keyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxHeight: 120,
  },
  copyButton: {
    marginLeft: 10,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  pleaseText: {
    marginVertical: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PleaseBackup;
