import re
import os

def fix_dates_and_fees(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Add the getLocalDatetimeString helper at the top of the component
    helper = """
    const getLocalDatetimeString = (utcString?: string | null) => {
        if (!utcString) return '';
        const date = new Date(utcString);
        if (isNaN(date.getTime())) return '';
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    };
"""
    if "getLocalDatetimeString" not in content:
        # Inject right after `const router = useRouter();`
        content = content.replace("const router = useRouter();", "const router = useRouter();\n" + helper)

    # Replace date initializations
    # Match: const [someDate, setSomeDate] = useState(initialData?.some_date ? new Date(initialData.some_date).toISOString().slice(0, 16) : '');
    date_pattern = r'const \[(\w+),\s*set\w+\] = useState\(initialData\?\.(\w+) \? new Date\(initialData\.\w+\)\.toISOString\(\)\.slice\(0,\s*16\) : \'\'\);'
    
    def replacer(match):
        state_var = match.group(1)
        db_var = match.group(2)
        return f"const [{state_var}, set{state_var[0].upper() + state_var[1:]}] = useState(getLocalDatetimeString(initialData?.{db_var}));"

    content = re.sub(date_pattern, replacer, content)

    # Fix hasRegistrationFee logic
    fee_logic_old = "useState(initialData?.team_price !== null && initialData?.team_price !== undefined);"
    fee_logic_new = "useState(initialData?.deposit_amount !== null && initialData?.deposit_amount !== undefined);"
    content = content.replace(fee_logic_old, fee_logic_new)

    # Fix playoffOptions array reference issue by moving it outside or wrapping in useMemo
    # Actually, we can just fix the useEffect to only depend on hasPlayoffBye
    playoff_effect = """    useEffect(() => {
        if (!playoffOptions.includes(teamsIntoPlayoffs)) {
            setTeamsIntoPlayoffs(playoffOptions[0]);
        }
    }, [hasPlayoffBye, playoffOptions, teamsIntoPlayoffs]);"""
    
    playoff_effect_new = """    useEffect(() => {
        const options = hasPlayoffBye ? [5, 9] : [4, 8];
        if (!options.includes(Number(teamsIntoPlayoffs))) {
            setTeamsIntoPlayoffs(options[0]);
        }
    }, [hasPlayoffBye, teamsIntoPlayoffs]);"""
    
    content = content.replace(playoff_effect, playoff_effect_new)

    with open(file_path, 'w') as f:
        f.write(content)

fix_dates_and_fees('src/components/admin/LeagueForm.tsx')
fix_dates_and_fees('src/components/admin/RollingLeagueForm.tsx')
fix_dates_and_fees('src/components/admin/TournamentForm.tsx')
print("Fixed dates, fees, and playoffOptions in forms")
