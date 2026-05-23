import { TextInput, View } from "react-native";

type TransactionSearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function TransactionSearchInput({
  value,
  onChangeText,
  placeholder = "Search transactions",
}: TransactionSearchInputProps) {
  return (
    <View className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        className="text-base text-slate-900"
        accessibilityLabel="Search transactions"
      />
    </View>
  );
}
