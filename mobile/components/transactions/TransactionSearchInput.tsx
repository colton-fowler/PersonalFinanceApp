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
    <View className="mb-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        className="text-[15px] text-slate-900"
        accessibilityLabel="Search transactions"
      />
    </View>
  );
}
