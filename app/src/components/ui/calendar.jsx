"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { th } from "date-fns/locale"; // 1. นำเข้า locale ภาษาไทย

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  startMonth = new Date(1900, 0),
  endMonth = new Date(2100, 11),
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      locale={th} // 2. ตั้งค่าภาษาไทย
      className={cn(
        "bg-background group/calendar p-4 [--cell-size:--spacing(9)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      formatters={{
        // 3. บังคับชื่อเดือนใน Dropdown เป็นภาษาไทย
        formatMonthDropdown: (date) =>
          date.toLocaleString("th-TH", { month: "long" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex gap-4 flex-col md:flex-row relative", defaultClassNames.months),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),

        // 4. แก้ไข Nav: เพิ่ม z-10 เพื่อให้ปุ่มลอยอยู่เหนือเลเยอร์อื่นและกดได้แน่นอน
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between p-1 pointer-events-none z-10",
          defaultClassNames.nav
        ),

        // ปุ่มลูกศรซ้าย
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto rounded-xl",
          defaultClassNames.button_previous
        ),
        // ปุ่มลูกศรขวา
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto rounded-xl",
          defaultClassNames.button_next
        ),

        month_caption: cn(
          "flex justify-center items-center h-9 w-full relative mb-2",
          defaultClassNames.month_caption
        ),

        caption_label: "hidden",

        dropdowns: cn(
          "flex items-center gap-2",
          defaultClassNames.dropdowns
        ),

        table: "w-full border-collapse space-y-1",
        weekdays: cn("flex mb-2", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none uppercase tracking-wide",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent/50 text-accent-foreground rounded-lg data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground opacity-30",
          defaultClassNames.outside
        ),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (<div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />);
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (<ChevronLeftIcon className={cn("size-4", className)} {...props} />);
          }
          if (orientation === "right") {
            return (<ChevronRightIcon className={cn("size-4", className)} {...props} />);
          }
          return (<ChevronDownIcon className={cn("size-4", className)} {...props} />);
        },
        DayButton: CalendarDayButton,

        // 5. Dropdown Logic: เพิ่ม key={value} เพื่อให้ UI อัปเดตทันทีที่กดลูกศรเปลี่ยนเดือน
        Dropdown: ({ value, onChange, options, ...props }) => {
          const selected = options?.find((child) => child.value === value);

          const handleChange = (value) => {
            const changeEvent = {
              target: { value },
            };
            onChange?.(changeEvent);
          };

          return (
            <Select
              key={value} // สำคัญ: ช่วยให้ Label อัปเดตเมื่อเดือนเปลี่ยนจากการกดลูกศร
              value={value?.toString()}
              onValueChange={handleChange}
            >
              {/* เพิ่ม z-20 ให้ Trigger เพื่อให้อยู่เหนือเลเยอร์อื่นๆ ในส่วน Caption */}
              <SelectTrigger className="pr-1.5 focus:ring-0 h-8 gap-1 font-medium bg-transparent border-none shadow-none hover:bg-accent/50 w-fit rounded-lg px-2 z-20 relative">
                <SelectValue>{selected?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-xl shadow-lg border-zinc-100 dark:border-zinc-800">
                <ScrollArea className="h-80">
                  {options?.map((option, id) => (
                    <SelectItem key={`${option.value}-${id}`} value={option.value?.toString() ?? ""} className="rounded-lg cursor-pointer my-0.5">
                      {option.label}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          )
        },

        ...components,
      }}
      {...props} />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70 rounded-lg",
        defaultClassNames.day,
        className
      )}
      {...props} />
  );
}

export { Calendar, CalendarDayButton }