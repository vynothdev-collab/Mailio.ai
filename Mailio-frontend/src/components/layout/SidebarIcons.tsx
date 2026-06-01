interface IconProps {
  active?: boolean;
  size?: number;
}

function stroke(active?: boolean): string {
  return active ? "#161514" : "#8B847A";
}

export function DashboardIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6.375 2.25H3.375C2.75368 2.25 2.25 2.75368 2.25 3.375V7.875C2.25 8.49632 2.75368 9 3.375 9H6.375C6.99632 9 7.5 8.49632 7.5 7.875V3.375C7.5 2.75368 6.99632 2.25 6.375 2.25Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.625 2.25H11.625C11.0037 2.25 10.5 2.75368 10.5 3.375V4.875C10.5 5.49632 11.0037 6 11.625 6H14.625C15.2463 6 15.75 5.49632 15.75 4.875V3.375C15.75 2.75368 15.2463 2.25 14.625 2.25Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.625 9H11.625C11.0037 9 10.5 9.50368 10.5 10.125V14.625C10.5 15.2463 11.0037 15.75 11.625 15.75H14.625C15.2463 15.75 15.75 15.2463 15.75 14.625V10.125C15.75 9.50368 15.2463 9 14.625 9Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.375 12H3.375C2.75368 12 2.25 12.5037 2.25 13.125V14.625C2.25 15.2463 2.75368 15.75 3.375 15.75H6.375C6.99632 15.75 7.5 15.2463 7.5 14.625V13.125C7.5 12.5037 6.99632 12 6.375 12Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function SingleVerifyIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M14.25 3.75H3.75C2.92157 3.75 2.25 4.42157 2.25 5.25V12.75C2.25 13.5784 2.92157 14.25 3.75 14.25H14.25C15.0784 14.25 15.75 13.5784 15.75 12.75V5.25C15.75 4.42157 15.0784 3.75 14.25 3.75Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.25 5.25L9 9.75L15.75 5.25" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function BulkVerifyIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M14.25 5.25H3.75C2.92157 5.25 2.25 5.92157 2.25 6.75V13.5C2.25 14.3284 2.92157 15 3.75 15H14.25C15.0784 15 15.75 14.3284 15.75 13.5V6.75C15.75 5.92157 15.0784 5.25 14.25 5.25Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.25 6.75L9 11.25L15.75 6.75" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.5 5.25V3.75C4.5 3.35218 4.65804 2.97064 4.93934 2.68934C5.22064 2.40804 5.60218 2.25 6 2.25H12C12.3978 2.25 12.7794 2.40804 13.0607 2.68934C13.342 2.97064 13.5 3.35218 13.5 3.75V5.25" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ResultsIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6 4.5H15.75" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 9H15.75" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 13.5H15.75" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 5.4001C3.49706 5.4001 3.9 4.99715 3.9 4.5001C3.9 4.00304 3.49706 3.6001 3 3.6001C2.50294 3.6001 2.1 4.00304 2.1 4.5001C2.1 4.99715 2.50294 5.4001 3 5.4001Z" fill={stroke(active)}/>
      <path d="M3 9.9001C3.49706 9.9001 3.9 9.49715 3.9 9.0001C3.9 8.50304 3.49706 8.1001 3 8.1001C2.50294 8.1001 2.1 8.50304 2.1 9.0001C2.1 9.49715 2.50294 9.9001 3 9.9001Z" fill={stroke(active)}/>
      <path d="M3 14.4001C3.49706 14.4001 3.9 13.9972 3.9 13.5001C3.9 13.003 3.49706 12.6001 3 12.6001C2.50294 12.6001 2.1 13.003 2.1 13.5001C2.1 13.9972 2.50294 14.4001 3 14.4001Z" fill={stroke(active)}/>
    </svg>
  );
}

export function UsageIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.25 12.75L6.75 8.25L9.75 11.25L15.75 5.25" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 5.25H15.75V10.5" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function BillingIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.25" y="4.5" width="13.5" height="9" rx="1.5" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.25 7.5H15.75" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.25 11.25H7.5" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function SettingsIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <g clipPath="url(#sidebar-settings-clip)">
        <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.55 11.25C14.4553 11.4731 14.4262 11.7186 14.466 11.9577C14.5059 12.1969 14.613 12.4196 14.775 12.6L14.85 12.675C15.0219 12.8039 15.1641 12.9683 15.267 13.157C15.3699 13.3457 15.431 13.5543 15.4462 13.7687C15.4615 13.983 15.4305 14.1982 15.3553 14.3995C15.2802 14.6009 15.1626 14.7837 15.0107 14.9357C14.8587 15.0876 14.6759 15.2052 14.4745 15.2803C14.2732 15.3555 14.058 15.3865 13.8437 15.3712C13.6293 15.356 13.4207 15.2949 13.232 15.192C13.0433 15.0891 12.8789 14.9469 12.75 14.775L12.675 14.7C12.4946 14.538 12.2719 14.4309 12.0327 14.391C11.7936 14.3512 11.5481 14.3803 11.325 14.475C11.1071 14.5733 10.9212 14.731 10.7886 14.9299C10.656 15.1288 10.582 15.361 10.575 15.6V15.75C10.575 16.1478 10.417 16.5294 10.1357 16.8107C9.85436 17.092 9.47283 17.25 9.075 17.25C8.67718 17.25 8.29564 17.092 8.01434 16.8107C7.73304 16.5294 7.575 16.1478 7.575 15.75V15.675C7.56166 15.4276 7.47653 15.1894 7.33002 14.9897C7.1835 14.7899 6.98195 14.6371 6.75 14.55C6.52686 14.4553 6.28136 14.4262 6.04225 14.466C5.80315 14.5059 5.58036 14.613 5.4 14.775L5.325 14.85C5.19606 15.0219 5.03167 15.1641 4.84298 15.267C4.65429 15.3699 4.4457 15.431 4.23133 15.4462C4.01697 15.4615 3.80183 15.4305 3.60049 15.3553C3.39915 15.2802 3.2163 15.1626 3.06434 15.0107C2.91238 14.8587 2.79484 14.6759 2.71969 14.4745C2.64455 14.2732 2.61354 14.058 2.62877 13.8437C2.64401 13.6293 2.70513 13.4207 2.808 13.232C2.91086 13.0433 3.05307 12.8789 3.225 12.75L3.3 12.675C3.46195 12.4946 3.56914 12.2719 3.60899 12.0327C3.64884 11.7936 3.61971 11.5481 3.525 11.325C3.42666 11.1071 3.26903 10.9212 3.0701 10.7886C2.87118 10.656 2.63898 10.582 2.4 10.575H2.25C1.85218 10.575 1.47064 10.417 1.18934 10.1357C0.908035 9.85436 0.75 9.47283 0.75 9.075C0.75 8.67718 0.908035 8.29564 1.18934 8.01434C1.47064 7.73304 1.85218 7.575 2.25 7.575H2.325C2.5724 7.56166 2.81055 7.47653 3.01034 7.33002C3.21014 7.1835 3.36292 6.98195 3.45 6.75C3.54471 6.52686 3.57384 6.28136 3.53399 6.04225C3.49414 5.80315 3.38696 5.58036 3.225 5.4L3.15 5.325C2.97807 5.19606 2.83586 5.03167 2.733 4.84298C2.63013 4.65429 2.56901 4.4457 2.55377 4.23133C2.53854 4.01697 2.56955 3.80183 2.64469 3.60049C2.71984 3.39915 2.83738 3.2163 2.98934 3.06434C3.1413 2.91238 3.32415 2.79484 3.52549 2.71969C3.72683 2.64455 3.94197 2.61354 4.15633 2.62877C4.3707 2.64401 4.57929 2.70513 4.76798 2.808C4.95667 2.91086 5.12106 3.05307 5.25 3.225L5.325 3.3C5.50536 3.46195 5.72815 3.56914 5.96725 3.60899C6.20636 3.64884 6.45186 3.61971 6.675 3.525H6.75C6.96791 3.42666 7.15379 3.26903 7.28641 3.0701C7.41902 2.87118 7.49304 2.63898 7.5 2.4V2.25C7.5 1.85218 7.65804 1.47064 7.93934 1.18934C8.22064 0.908035 8.60218 0.75 9 0.75C9.39782 0.75 9.77936 0.908035 10.0607 1.18934C10.342 1.47064 10.5 1.85218 10.5 2.25V2.325C10.507 2.56398 10.581 2.79618 10.7136 2.9951C10.8462 3.19403 11.0321 3.35166 11.25 3.45C11.4731 3.54471 11.7186 3.57384 11.9577 3.53399C12.1969 3.49414 12.4196 3.38696 12.6 3.225L12.675 3.15C12.8039 2.97807 12.9683 2.83586 13.157 2.733C13.3457 2.63013 13.5543 2.56901 13.7687 2.55377C13.983 2.53854 14.1982 2.56955 14.3995 2.64469C14.6009 2.71984 14.7837 2.83738 14.9357 2.98934C15.0876 3.1413 15.2052 3.32415 15.2803 3.52549C15.3555 3.72683 15.3865 3.94197 15.3712 4.15633C15.356 4.3707 15.2949 4.57929 15.192 4.76798C15.0891 4.95667 14.9469 5.12106 14.775 5.25L14.7 5.325C14.538 5.50536 14.4309 5.72815 14.391 5.96725C14.3512 6.20636 14.3803 6.45186 14.475 6.675V6.75C14.7 7.2 15.15 7.5 15.6 7.5H15.75C16.1478 7.5 16.5294 7.65804 16.8107 7.93934C17.092 8.22064 17.25 8.60218 17.25 9C17.25 9.39782 17.092 9.77936 16.8107 10.0607C16.5294 10.342 16.1478 10.5 15.75 10.5H15.675C15.436 10.507 15.2038 10.581 15.0049 10.7136C14.806 10.8462 14.6483 11.0321 14.55 11.25Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <defs>
        <clipPath id="sidebar-settings-clip">
          <rect width="18" height="18" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

export function HelpIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 15.75C12.7279 15.75 15.75 12.7279 15.75 9C15.75 5.27208 12.7279 2.25 9 2.25C5.27208 2.25 2.25 5.27208 2.25 9C2.25 12.7279 5.27208 15.75 9 15.75Z" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 6H9.0075" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.25 9H9V12H9.75" stroke={stroke(active)} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UsersIcon({ active, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M12.75 15.75v-1.5a3 3 0 0 0-3-3h-4.5a3 3 0 0 0-3 3v1.5"
        stroke={stroke(active)}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 8.25a2.625 2.625 0 1 0 0-5.25 2.625 2.625 0 0 0 0 5.25Z"
        stroke={stroke(active)}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.75 15.75v-1.5a3 3 0 0 0-2.25-2.91M12 3.09a3 3 0 0 1 0 5.82"
        stroke={stroke(active)}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const SIDEBAR_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  dashboard:     DashboardIcon,
  "single-verify": SingleVerifyIcon,
  "bulk-verify": BulkVerifyIcon,
  results:       ResultsIcon,
  usage:         UsageIcon,
  users:         UsersIcon,
  billing:       BillingIcon,
  settings:      SettingsIcon,
  help:          HelpIcon,
};
