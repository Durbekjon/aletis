import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChannelsQuery } from "@/src/hooks/useChannelsQuery"

interface ChannelFilterDropdownProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function ChannelFilterDropdown({ 
  value, 
  onValueChange, 
  placeholder = "All Channels" 
}: ChannelFilterDropdownProps) {
  const { data: channelsData, isLoading } = useChannelsQuery()

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    )
  }
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Channels</SelectItem>
        {channelsData?.items.map((channel) => (
          <SelectItem key={channel.id} value={channel.id.toString()}>
            @{channel.channelUsername}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
