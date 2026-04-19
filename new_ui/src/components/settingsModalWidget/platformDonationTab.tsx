import React from 'react'
import { TabsContent } from '../ui/tabs'
import { Label } from '../ui/label'
import MyBtn from '../ui/my-btn'
import { DialogDescription } from '../ui/dialog'
import { Input } from '../ui/input'
import UpDownBtn from '../ui/funny-btn'
import { CurrencySelect } from '../ui/currency-selector'
import DonationItem from './donationItem'
import type { DonationPlatform, ReadDonationRules } from '@/types/playlist'

interface PlatformDonationProps {
  platform: DonationPlatform
  platformKey: string
  rules: Array<ReadDonationRules> | undefined
  playlist_id: string
  createNewRule: (
    platform: DonationPlatform,
    name: string,
    slug: string,
    priority: number,
    amount: number,
    currency: string,
  ) => void
  handleDeleteRule: (
    platform: DonationPlatform,
    playlist_id: string,
    rule_id: string,
  ) => void
}

const PlatformDonationEditor = React.memo(
  ({
    platform,
    platformKey,
    rules,
    playlist_id,
    createNewRule,
    handleDeleteRule,
  }: PlatformDonationProps) => {
    const [newRuleData, setNewRuleData] = React.useState({
      name: '',
      slug: '',
      currency: '',
      amount: 0,
      priority: 0,
    })

    const priorityInputRef = React.useRef<HTMLInputElement>(null)
    const amountInputRef = React.useRef<HTMLInputElement>(null)

    return (
      <TabsContent value={platform} className="space-y-6 mb-4">
        <div>
          <Label className="text-xl">{platformKey} settings</Label>
          <DialogDescription>
            Configure donation settings for {platformKey}
          </DialogDescription>
        </div>

        <div className="flex gap-1 sm:gap-2">
          <MyBtn
            text="Add"
            onClick={() =>
              createNewRule(
                platform,
                newRuleData.name,
                newRuleData.slug,
                newRuleData.priority,
                newRuleData.amount,
                newRuleData.currency,
              )
            }
            className="px-2 text-sm h-8 self-end"
          />
          {/* Name */}
          <div className=" flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={newRuleData.name || ''}
              placeholder="Rule name"
              className="text-sm sm:text-base bg-level-2 border-0"
              onChange={(e) =>
                setNewRuleData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
          </div>

          {/* Slug */}
          <div className=" flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Slug</Label>
            <Input
              value={newRuleData.slug || ''}
              placeholder="rule-slug"
              className="text-sm sm:text-base bg-level-2 border-0"
              onChange={(e) =>
                setNewRuleData((prev) => ({
                  ...prev,
                  slug: e.target.value,
                }))
              }
            />
          </div>

          {/* Amount */}
          <div className=" flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <div className="flex rounded-[--rounded-std] items-center gap-0 overflow-hidden">
              <Input
                type="number"
                ref={amountInputRef}
                value={newRuleData.amount || 0}
                dir="rtl"
                className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) =>
                  setNewRuleData((prev) => ({
                    ...prev,
                    amount: Number(e.target.value),
                  }))
                }
              />
              <UpDownBtn getInputRef={() => amountInputRef.current} />
            </div>
          </div>

          {/* Currency */}
          <div className="col-span-1 flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Currency</Label>
            <CurrencySelect
              name="currency"
              value={newRuleData.currency}
              onValueChange={(value) =>
                setNewRuleData((prev) => ({ ...prev, currency: value }))
              }
              variant="default"
              className="hidden sm:flex"
            />
            <CurrencySelect
              name="currency"
              value={newRuleData.currency}
              onValueChange={(value) =>
                setNewRuleData((prev) => ({ ...prev, currency: value }))
              }
              variant="small"
              className="sm:hidden"
            />
          </div>

          {/* Priority */}
          <div className="col-span-1 flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <div className="flex rounded-[--rounded-std] items-center gap-0 overflow-hidden">
              <Input
                type="number"
                dir="rtl"
                ref={priorityInputRef}
                value={newRuleData.priority || 0}
                className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) =>
                  setNewRuleData((prev) => ({
                    ...prev,
                    priority: Number(e.target.value),
                  }))
                }
              />
              <UpDownBtn getInputRef={() => priorityInputRef.current} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-md">
                  <DonationItem
                    rule={rule}
                    playlist_id={playlist_id}
                    handleDeleteRule={handleDeleteRule}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <Label>No rules configured</Label>
              <DialogDescription>
                Create a new rule to get started
              </DialogDescription>
            </div>
          )}
        </div>
      </TabsContent>
    )
  },
)
PlatformDonationEditor.displayName = 'PlatformDonationEditor'
export default PlatformDonationEditor
